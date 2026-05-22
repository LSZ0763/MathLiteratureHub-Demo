import httpx
from datetime import date
from typing import List
from sqlalchemy.orm import Session
from app import models
from app.services.subject_config import get_classification
import json
import time

ZBMATh_API_URL = "https://api.zbmath.org/v1/document/_search"


def _build_zbmath_query(
    conditions,
    date_from: date,
    date_to: date,
    default_subject: str,
    default_subfield: str,
) -> str:
    """Build zbMATH syntax search string from advanced search conditions.

    zbMATH query syntax:
      - cc:XX      -> MSC primary classification (first two digits)
      - py:YYYY    -> publication year
      - py:YYYY-YYYY -> year range
      - ti:word    -> title
      - au:name    -> author
      - doi:...    -> DOI
      - &          -> AND
      - |          -> OR
      - !          -> NOT
    """
    parts: List[str] = []

    # Determine subject/subfield from conditions or defaults
    subject_val = default_subject
    subfield_val = default_subfield
    for cond in conditions:
        if cond.field == "subject":
            subject_val = cond.value
        elif cond.field == "subfield":
            subfield_val = cond.value

    # MSC classification using 'cc' (first two digits of MSC2020)
    msc = get_classification(subject_val, subfield_val, "zbmath_msc")
    if msc:
        parts.append(f"cc:{msc}")

    # Date range via py:YYYY-YYYY
    # Only apply if the range is not the default "all years" feel;
    # zbMATH results are already sorted by relevance + date implicitly,
    # but explicit year filtering improves precision.
    if date_from and date_to:
        year_from = date_from.year
        year_to = date_to.year
        if year_from == year_to:
            parts.append(f"py:{year_from}")
        else:
            parts.append(f"py:{year_from}-{year_to}")

    # Process user search conditions
    for cond in conditions:
        val = cond.value.strip()
        if not val:
            continue
        if cond.field in ("subject", "subfield"):
            continue

        if cond.field == "topic":
            if cond.match == "exact":
                parts.append(f'ti:"{val}"')
            else:
                parts.append(f"ti:{val}")
        elif cond.field == "author":
            if cond.match == "exact":
                parts.append(f'au:"{val}"')
            else:
                parts.append(f"au:{val}")
        elif cond.field == "doi":
            parts.append(f"doi:{val}")
        elif cond.field == "source":
            # zbMATH source / journal search via jo:
            parts.append(f"jo:{val}")

    # Join with AND (&) by default
    return " & ".join(parts) if parts else "*"


def _parse_title(item: dict) -> str:
    """Extract article title from zbMATH response."""
    title_obj = item.get("title")
    if isinstance(title_obj, dict):
        return title_obj.get("title") or ""
    if isinstance(title_obj, str):
        return title_obj
    return ""


def _parse_source_str(item: dict) -> str:
    """Extract human-readable source string from zbMATH response."""
    source = item.get("source")
    if isinstance(source, dict):
        # Prefer the 'source' sub-field if present
        src_str = source.get("source")
        if src_str:
            return src_str
        # Fallback: construct from serial info
        serial = source.get("serial")
        if serial and isinstance(serial, dict):
            title = serial.get("title") or ""
            volume = source.get("volume") or ""
            issue = source.get("issue") or ""
            pages = source.get("pages") or ""
            year = source.get("year") or item.get("year") or ""
            parts = [p for p in [title, f"{volume}({issue})" if volume and issue else volume, pages, year] if p]
            return ", ".join(parts)
        # Book source
        book = source.get("book")
        if book and isinstance(book, list) and len(book) > 0:
            b = book[0]
            publisher = b.get("publisher") or ""
            year = b.get("year") or item.get("year") or ""
            return f"{publisher} ({year})" if publisher else str(year)
    if isinstance(source, str):
        return source
    return ""


def search_zbmath(
    conditions,
    date_from: date,
    date_to: date,
    db: Session,
    default_subject: str = "数学",
    default_subfield: str = "动力系统",
    max_results: int = 50,
) -> List[models.Paper]:
    """Search zbMATH via official API and normalize results to Paper model."""
    search_string = _build_zbmath_query(
        conditions, date_from, date_to, default_subject, default_subfield
    )
    params = {
        "search_string": search_string,
        "results_per_page": max_results,
    }

    last_exception = None
    for attempt in range(3):
        try:
            resp = httpx.get(ZBMATh_API_URL, params=params, timeout=30)
            resp.raise_for_status()
            break
        except Exception as e:
            last_exception = e
            time.sleep(2 ** attempt)
    else:
        raise last_exception

    data = resp.json()
    results: List[models.Paper] = []
    seen_titles: set[str] = set()
    seen_dois: set[str] = set()

    # Handle both direct list and {"result": [...]} wrapper
    if isinstance(data, dict):
        items = data.get("result") or []
    else:
        items = data if isinstance(data, list) else []

    if not items:
        return results

    # Load keywords from DB for post-filtering (same logic as arXiv)
    keywords = db.query(models.Keyword).all()
    and_keywords = [k.term.lower() for k in keywords if k.logic == "AND"]
    or_keywords = [k.term.lower() for k in keywords if k.logic == "OR"]
    not_keywords = [k.term.lower() for k in keywords if k.logic == "NOT"]

    for item in items:
        if not isinstance(item, dict):
            continue

        title = _parse_title(item)
        authors_list = []
        for a in item.get("contributors", {}).get("authors", []) or []:
            name = a.get("name", "").strip()
            if name:
                authors_list.append(name)
        authors = json.dumps(authors_list, ensure_ascii=False)

        # Parse date
        published_date = None
        year_str = item.get("year")
        if year_str:
            try:
                year = int(str(year_str)[:4])
                published_date = date(year, 1, 1)
            except Exception:
                pass
        # Fallback to datestamp
        if not published_date:
            datestamp = item.get("datestamp", "")
            if datestamp and len(datestamp) >= 10:
                try:
                    published_date = date(
                        int(datestamp[0:4]), int(datestamp[5:7]), int(datestamp[8:10])
                    )
                except Exception:
                    pass

        doi = ""
        pdf_link = ""
        for link in item.get("links", []) or []:
            if link.get("type") == "doi":
                doi = link.get("identifier") or ""
                pdf_link = link.get("url") or f"https://doi.org/{doi}"
                break

        # Fallback to zbMATH URL
        zbmath_url = item.get("zbmath_url", "")
        zbl_id = item.get("identifier", "")
        if not pdf_link:
            pdf_link = zbmath_url or (f"https://zbmath.org/{zbl_id}" if zbl_id else "")

        # Summary / abstract
        summary_raw = ""
        for contrib in item.get("editorial_contributions", []) or []:
            text = contrib.get("text", "")
            if text:
                summary_raw = text
                break

        # Keyword filtering on title + summary
        combined = (title + " " + summary_raw).lower()
        if not_keywords and any(k in combined for k in not_keywords):
            continue
        if and_keywords and not all(k in combined for k in and_keywords):
            continue
        if or_keywords and not any(k in combined for k in or_keywords):
            continue

        # In-batch deduplication by title or DOI
        if title in seen_titles:
            continue
        if doi and doi in seen_dois:
            continue
        seen_titles.add(title)
        if doi:
            seen_dois.add(doi)

        # Journal / source string
        journal = _parse_source_str(item)
        
        # Deduplicate against database by zbMATH identifier (Zbl number)
        existing = (
            db.query(models.Paper)
            .filter(models.Paper.title == title, models.Paper.source == "zbmath")
            .first()
        )
        if existing:
            paper = existing
            if not paper.journal and journal:
                paper.journal = journal
                db.commit()
                db.refresh(paper)
        else:
            paper = models.Paper(
                arxiv_id=None,
                title=title,
                authors=authors,
                published_date=published_date,
                summary_raw=summary_raw,
                doi=doi,
                pdf_link=pdf_link,
                source="zbmath",
                journal=journal,
            )
            db.add(paper)
            db.commit()
            db.refresh(paper)
        results.append(paper)

    # Enrich citations for zbmath papers too
    from app.services.citation_enricher import batch_enrich
    batch_enrich(results, db)

    return results
