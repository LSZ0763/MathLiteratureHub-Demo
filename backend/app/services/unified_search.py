from datetime import date, timedelta
from typing import List
from sqlalchemy.orm import Session
from app import models
from app.services.arxiv_search import search_arxiv
from app.services.zbmath_search import search_zbmath
from app.services.mathscinet_search import search_mathscinet
from app.services.citation_enricher import batch_enrich
from app.services.subject_config import list_subjects, list_subfields


def resolve_dates(date_preset: str | None, date_from: date | None, date_to: date | None) -> tuple[date, date]:
    """Resolve date range from preset or explicit dates."""
    if date_preset and date_preset != "custom":
        today = date.today()
        date_to = today
        if date_preset == "7d":
            date_from = today - timedelta(days=7)
        elif date_preset == "14d":
            date_from = today - timedelta(days=14)
        elif date_preset == "30d":
            date_from = today - timedelta(days=30)
        else:
            date_from = today - timedelta(days=7)
    else:
        if not date_from:
            date_from = date.today() - timedelta(days=7)
        if not date_to:
            date_to = date.today()
    return date_from, date_to


def perform_search(
    conditions,
    date_preset: str | None,
    date_from: date | None,
    date_to: date | None,
    sources: List[str],
    db: Session,
    default_subject: str = "数学",
    default_subfield: str = "动力系统",
    max_results: int = 50,
) -> List[models.Paper]:
    """Perform unified search across configured sources."""
    date_from, date_to = resolve_dates(date_preset, date_from, date_to)

    all_results: List[models.Paper] = []
    per_source_limit = max(1, max_results // len(sources)) if sources else max_results

    for source in sources:
        try:
            if source == "arxiv":
                papers = search_arxiv(
                    conditions, date_from, date_to, db,
                    default_subject=default_subject,
                    default_subfield=default_subfield,
                    max_results=per_source_limit,
                )
                all_results.extend(papers)
            elif source == "zbmath":
                papers = search_zbmath(
                    conditions, date_from, date_to, db,
                    default_subject=default_subject,
                    default_subfield=default_subfield,
                    max_results=per_source_limit,
                )
                all_results.extend(papers)
            elif source == "mathscinet":
                papers = search_mathscinet(
                    conditions, date_from, date_to, db,
                    default_subject=default_subject,
                    default_subfield=default_subfield,
                    max_results=per_source_limit,
                )
                all_results.extend(papers)
        except Exception:
            # Log and continue with other sources
            import traceback
            traceback.print_exc()
            continue

    # Enrich citations for newly fetched papers
    batch_enrich(all_results, db)

    # Sort by published_date descending
    all_results.sort(key=lambda p: p.published_date or date.min, reverse=True)
    return all_results
