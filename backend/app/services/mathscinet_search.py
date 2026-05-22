import httpx
from datetime import date
from typing import List
from sqlalchemy.orm import Session
from app import models
from app.services.subject_config import get_classification
import json
import time

OPENALEX_API_URL = "https://api.openalex.org/works"
MATHSCINET_SEARCH_URL = "https://mathscinet.ams.org/mathscinet/search"


def _build_openalex_query(
    conditions,
    date_from: date,
    date_to: date,
    default_subject: str,
    default_subfield: str,
    max_results: int,
):
    """Build OpenAlex API query parameters.

    OpenAlex is an open, compliant alternative to MathSciNet scraping.
    It provides bibliographic metadata with subject classification via
    the Concepts system, allowing better relevance for mathematics than
    generic CrossRef title searches.
    """
    # Extract user-provided search terms
    query_title = ""
    query_author = ""
    query_doi = ""
    subject_val = default_subject
    subfield_val = default_subfield

    for cond in conditions:
        if cond.field == "subject":
            subject_val = cond.value
        elif cond.field == "subfield":
            subfield_val = cond.value

    for cond in conditions:
        val = cond.value.strip()
        if not val:
            continue
        if cond.field == "topic":
            query_title = val
        elif cond.field == "author":
            query_author = val
        elif cond.field == "doi":
            query_doi = val

    # Build filter string
    filters = [
        "concepts.id:C33923547",  # Mathematics concept
        f"from_publication_date:{date_from.isoformat()}",
        f"to_publication_date:{date_to.isoformat()}",
    ]

    params = {
        "per-page": max_results,
        "filter": ",".join(filters),
        "select": "id,display_name,title,publication_year,publication_date,doi,authorships,primary_location,open_access,ids,cited_by_count,referenced_works,concepts",
    }

    if query_doi:
        # DOI lookup bypasses the search string
        params["filter"] += f",doi:{query_doi}"
    elif query_title:
        # Use search for full-text relevance ranking
        search_parts = [query_title]
        if query_author:
            search_parts.append(query_author)
        params["search"] = " ".join(search_parts)
    elif query_author:
        params["search"] = query_author
    else:
        # Broad fallback using subfield name
        msc = get_classification(subject_val, subfield_val, "mathscinet_msc")
        if msc:
            params["search"] = subfield_val
        else:
            params["search"] = subfield_val or "mathematics"

    return params


def _parse_openalex_authors(item: dict) -> tuple[List[str], str]:
    """Extract author names and JSON-serialized authors list."""
    authors_list = []
    for authorship in item.get("authorships", []) or []:
        author = authorship.get("author", {})
        name = author.get("display_name", "").strip()
        if not name and authorship.get("raw_author_name"):
            name = authorship["raw_author_name"].strip()
        if name:
            authors_list.append(name)
    authors_json = json.dumps(authors_list, ensure_ascii=False)
    return authors_list, authors_json


def _parse_openalex_date(item: dict) -> date | None:
    """Parse publication date from OpenAlex item."""
    pub_date = item.get("publication_date")
    if pub_date and len(pub_date) >= 10:
        try:
            return date(
                int(pub_date[0:4]),
                int(pub_date[5:7]),
                int(pub_date[8:10]),
            )
        except Exception:
            pass
    pub_year = item.get("publication_year")
    if pub_year:
        try:
            return date(int(pub_year), 1, 1)
        except Exception:
            pass
    return None


def _build_display_link(item: dict, authors_list: List[str], title: str) -> str:
    """Build a display link for the paper.

    Priority:
      1. Open access URL (if available)
      2. DOI resolver link
      3. Primary landing page URL
      4. MathSciNet search fallback
    """
    # Open access link
    oa = item.get("open_access", {})
    oa_url = oa.get("oa_url") if oa else None
    if oa_url:
        return oa_url

    # DOI link
    doi = item.get("doi", "")
    if doi:
        return doi if doi.startswith("http") else f"https://doi.org/{doi}"

    # Primary location landing page
    loc = item.get("primary_location", {})
    landing = loc.get("landing_page_url") if loc else None
    if landing:
        return landing

    # MathSciNet search fallback
    q_params = {}
    if title:
        q_params["ti"] = title
    if authors_list:
        first_author = authors_list[0].split(",")[0].strip()
        if first_author:
            q_params["au"] = first_author
    if q_params:
        return f"{MATHSCINET_SEARCH_URL}?{httpx.QueryParams(q_params)}"

    return MATHSCINET_SEARCH_URL


def _extract_references(item: dict) -> List[dict]:
    """Extract reference list from OpenAlex item."""
    refs = []
    for ref in item.get("referenced_works", [])[:20]:
        refs.append({"openalex_id": ref})
    return refs


def search_mathscinet(
    conditions,
    date_from: date,
    date_to: date,
    db: Session,
    default_subject: str = "数学",
    default_subfield: str = "动力系统",
    max_results: int = 50,
) -> List[models.Paper]:
    """Search mathematical literature via OpenAlex API (compliant alternative to MathSciNet scraping).

    Results are labeled as 'mathscinet' source for display purposes.
    MathSciNet itself has no public API; we use OpenAlex (which provides
    subject-classified academic metadata) to fetch relevant mathematics
    papers and provide a link to view them via DOI or MathSciNet.
    """
    params = _build_openalex_query(
        conditions, date_from, date_to, default_subject, default_subfield, max_results
    )

    last_exception = None
    for attempt in range(3):
        try:
            headers = {"User-Agent": "MathLiteratureHub/0.1.0"}
            resp = httpx.get(OPENALEX_API_URL, params=params, headers=headers, timeout=30)
            resp.raise_for_status()
            break
        except Exception as e:
            last_exception = e
            time.sleep(2 ** attempt)
    else:
        raise last_exception

    data = resp.json()
    items = data.get("results", [])

    # Load keywords from DB for post-filtering
    keywords = db.query(models.Keyword).all()
    and_keywords = [k.term.lower() for k in keywords if k.logic == "AND"]
    or_keywords = [k.term.lower() for k in keywords if k.logic == "OR"]
    not_keywords = [k.term.lower() for k in keywords if k.logic == "NOT"]

    results: List[models.Paper] = []
    # Track keys seen in this batch to avoid duplicates within the same response.
    # OpenAlex may return multiple versions of the same paper (preprint, published,
    # different platforms) with different DOIs but identical titles.
    seen_titles: set[str] = set()
    seen_dois: set[str] = set()

    for item in items:
        title = item.get("display_name") or item.get("title", "") or "(无标题)"
        authors_list, authors_json = _parse_openalex_authors(item)
        published_date = _parse_openalex_date(item)
        doi = item.get("doi", "")
        if doi and doi.startswith("https://doi.org/"):
            doi = doi.replace("https://doi.org/", "")

        pdf_link = _build_display_link(item, authors_list, title)

        # Abstract is rarely present in OpenAlex; leave empty
        summary_raw = ""

        # Citation / reference data
        citation_count = item.get("cited_by_count", 0) or 0
        referenced_works = item.get("referenced_works", []) or []
        reference_count = len(referenced_works)
        
        # Journal
        loc = item.get("primary_location", {}) or {}
        src = loc.get("source", {}) or {}
        journal = src.get("display_name", "") if src else ""
        
        # Keywords from concepts
        concepts = item.get("concepts", []) or []
        kw = [c.get("display_name", "") for c in concepts[:8] if c.get("display_name")]
        keywords_json = json.dumps(kw, ensure_ascii=False) if kw else None
        
        # References list
        refs = _extract_references(item)
        refs_json = json.dumps(refs, ensure_ascii=False) if refs else None

        # Keyword filtering on title
        combined = title.lower()
        if not_keywords and any(k in combined for k in not_keywords):
            continue
        if and_keywords and not all(k in combined for k in and_keywords):
            continue
        if or_keywords and not any(k in combined for k in or_keywords):
            continue

        # In-batch deduplication by title OR DOI
        if title in seen_titles:
            continue
        if doi and doi in seen_dois:
            continue
        seen_titles.add(title)
        if doi:
            seen_dois.add(doi)

        # Deduplicate against database by DOI or title
        existing = None
        if doi:
            existing = (
                db.query(models.Paper)
                .filter(models.Paper.doi == doi, models.Paper.source == "mathscinet")
                .first()
            )
        if not existing:
            existing = (
                db.query(models.Paper)
                .filter(models.Paper.title == title, models.Paper.source == "mathscinet")
                .first()
            )

        if existing:
            paper = existing
            # Update citation data if previously zero
            if (paper.citation_count or 0) == 0 and citation_count > 0:
                paper.citation_count = citation_count
                paper.reference_count = reference_count
                if journal and not paper.journal:
                    paper.journal = journal
                if keywords_json and not paper.keywords:
                    paper.keywords = keywords_json
                if refs_json and not paper.refs:
                    paper.refs = refs_json
                db.commit()
                db.refresh(paper)
        else:
            paper = models.Paper(
                arxiv_id=None,
                title=title,
                authors=authors_json,
                published_date=published_date,
                summary_raw=summary_raw,
                doi=doi,
                pdf_link=pdf_link,
                source="mathscinet",
                citation_count=citation_count,
                reference_count=reference_count,
                journal=journal,
                keywords=keywords_json,
                refs=refs_json,
            )
            db.add(paper)
            db.commit()
            db.refresh(paper)
        results.append(paper)

    return results
