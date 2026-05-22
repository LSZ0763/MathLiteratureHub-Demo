import httpx
import xml.etree.ElementTree as ET
from datetime import date, datetime
from typing import List
from sqlalchemy.orm import Session
from app import models
from app.services.subject_config import get_classification
import json
import time

ARXIV_API_URL = "https://export.arxiv.org/api/query"
NAMESPACE = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}


def build_arxiv_query(conditions, date_from: date, date_to: date, default_subject: str, default_subfield: str) -> str:
    """Build arXiv search_query string from advanced search conditions."""
    parts = []

    # Date range is always applied via submittedDate
    date_range = f"[{date_from.strftime('%Y%m%d')}000000 TO {date_to.strftime('%Y%m%d')}235959]"
    parts.append(f"submittedDate:{date_range}")

    # Determine category from subject/subfield conditions or defaults
    category = None
    subject_val = default_subject
    subfield_val = default_subfield

    for cond in conditions:
        if cond.field == "subject":
            subject_val = cond.value
        elif cond.field == "subfield":
            subfield_val = cond.value

    category = get_classification(subject_val, subfield_val, "arxiv")
    if not category:
        category = "math.DS"  # fallback
    parts.append(f"cat:{category}")

    # Process other conditions
    for cond in conditions:
        if cond.field in ("subject", "subfield"):
            continue
        val = cond.value.strip()
        if not val:
            continue

        if cond.field == "topic":
            # Always quote multi-word phrases to prevent Lucene from splitting
            # them into OR queries (e.g. ti:dynamical systems -> ti:dynamical OR all:systems)
            search_term = f'"{val}"' if ' ' in val else val
            if cond.match == "exact":
                parts.append(f'(ti:"{val}" OR abs:"{val}")')
            else:
                parts.append(f'(ti:{search_term} OR abs:{search_term})')
        elif cond.field == "author":
            if cond.match == "exact":
                parts.append(f'au:"{val}"')
            else:
                # Split name into parts and require ALL parts in author field.
                # Prevents Lucene from parsing "au:Steven Strogatz" as
                # "au:Steven OR all:Strogatz".
                name_parts = val.split()
                if len(name_parts) == 1:
                    parts.append(f'au:{val}')
                else:
                    author_subq = " AND ".join(f"au:{part}" for part in name_parts)
                    parts.append(f"({author_subq})")
        elif cond.field == "source":
            # arXiv source filtering is limited; skip or use journal-ref if available
            pass
        elif cond.field == "doi":
            parts.append(f'doi:{val}')

    return " AND ".join(parts)


def search_arxiv(
    conditions,
    date_from: date,
    date_to: date,
    db: Session,
    default_subject: str = "数学",
    default_subfield: str = "动力系统",
    max_results: int = 50,
) -> List[models.Paper]:
    """Search arXiv with advanced conditions, filter by keywords, save to DB."""
    search_query = build_arxiv_query(conditions, date_from, date_to, default_subject, default_subfield)
    params = {
        "search_query": search_query,
        "start": 0,
        "max_results": max_results,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    }

    # Fetch from arXiv with retries
    # Use longer timeout (60s) because arXiv API can be slow for large date ranges.
    last_exception = None
    for attempt in range(3):
        try:
            resp = httpx.get(ARXIV_API_URL, params=params, timeout=60)
            resp.raise_for_status()
            break
        except Exception as e:
            last_exception = e
            # Exponential backoff with longer base delay to respect rate limits
            time.sleep(5 * (2 ** attempt))
    else:
        raise last_exception

    root = ET.fromstring(resp.text)
    entries = root.findall("atom:entry", NAMESPACE)

    # Load keywords from DB for post-filtering
    keywords = db.query(models.Keyword).all()
    and_keywords = [k.term.lower() for k in keywords if k.logic == "AND"]
    or_keywords = [k.term.lower() for k in keywords if k.logic == "OR"]
    not_keywords = [k.term.lower() for k in keywords if k.logic == "NOT"]

    results: List[models.Paper] = []
    for entry in entries:
        title = _get_text(entry, "atom:title")
        summary_text = _get_text(entry, "atom:summary")
        authors_els = entry.findall("atom:author", NAMESPACE)
        authors = [a.findtext("atom:name", "", NAMESPACE) for a in authors_els]
        published = _get_text(entry, "atom:published")
        arxiv_id = _get_text(entry, "atom:id")
        pdf_link = ""
        for link in entry.findall("atom:link", NAMESPACE):
            if link.get("title") == "pdf":
                pdf_link = link.get("href", "")
                break
        doi = ""
        doi_el = entry.find("arxiv:doi", NAMESPACE)
        if doi_el is not None:
            doi = doi_el.text or ""
        
        # Journal-ref from arXiv
        journal = ""
        journal_el = entry.find("arxiv:journal_ref", NAMESPACE)
        if journal_el is not None:
            journal = journal_el.text or ""

        # Keyword filtering on title + summary
        combined = (title + " " + summary_text).lower()
        if not_keywords and any(k in combined for k in not_keywords):
            continue
        if and_keywords and not all(k in combined for k in and_keywords):
            continue
        if or_keywords and not any(k in combined for k in or_keywords):
            continue

        # Deduplicate by arxiv_id
        existing = db.query(models.Paper).filter(models.Paper.arxiv_id == arxiv_id).first()
        if existing:
            paper = existing
            # Update journal if previously empty
            if not paper.journal and journal:
                paper.journal = journal
                db.commit()
                db.refresh(paper)
        else:
            paper = models.Paper(
                arxiv_id=arxiv_id,
                title=title,
                authors=json.dumps(authors, ensure_ascii=False),
                published_date=datetime.strptime(published[:10], "%Y-%m-%d").date() if published else None,
                summary_raw=summary_text,
                doi=doi,
                pdf_link=pdf_link,
                source="arxiv",
                journal=journal,
            )
            db.add(paper)
            db.commit()
            db.refresh(paper)
        results.append(paper)

    return results


def _get_text(element, tag):
    el = element.find(tag, NAMESPACE)
    return (el.text or "").strip() if el is not None else ""
