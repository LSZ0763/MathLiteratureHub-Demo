import httpx
import json
from typing import Optional, List
from sqlalchemy.orm import Session
from app import models
import time

OPENALEX_API_URL = "https://api.openalex.org/works"


def enrich_paper_citations(paper: models.Paper, db: Session) -> models.Paper:
    """Try to enrich a paper with citation/refernce data from OpenAlex by DOI or title."""
    if paper.citation_count is not None and paper.citation_count > 0:
        return paper
    
    query = None
    if paper.doi:
        query = f"doi:{paper.doi}"
    elif paper.title:
        query = paper.title
    
    if not query:
        return paper
    
    try:
        params = {
            "search": query,
            "per-page": 5,
            "select": "id,display_name,title,publication_year,cited_by_count,referenced_works,concepts,primary_location,authorships,doi",
        }
        resp = httpx.get(OPENALEX_API_URL, params=params, timeout=15, headers={"User-Agent": "MathLiteratureHub/0.1.0"})
        resp.raise_for_status()
        data = resp.json()
        items = data.get("results", [])
        if not items:
            return paper
        
        # Pick best match by title similarity or exact DOI
        best = items[0]
        for item in items:
            item_doi = (item.get("doi") or "").replace("https://doi.org/", "")
            if paper.doi and item_doi == paper.doi:
                best = item
                break
        
        # Citation count
        paper.citation_count = best.get("cited_by_count", 0) or 0
        
        # Reference count
        refs = best.get("referenced_works", []) or []
        paper.reference_count = len(refs)
        
        # Journal
        loc = best.get("primary_location", {}) or {}
        src = loc.get("source", {}) or {}
        if src and src.get("display_name"):
            paper.journal = src["display_name"]
        
        # Keywords from concepts
        concepts = best.get("concepts", []) or []
        kw = [c.get("display_name", "") for c in concepts[:8] if c.get("display_name")]
        if kw:
            paper.keywords = json.dumps(kw, ensure_ascii=False)
        
        # References list (fetch top N titles)
        ref_list = _fetch_reference_titles(refs[:20])
        if ref_list:
            paper.refs = json.dumps(ref_list, ensure_ascii=False)
        
        db.commit()
        db.refresh(paper)
    except Exception:
        pass
    
    return paper


def _fetch_reference_titles(ref_openalex_ids: List[str]) -> List[dict]:
    """Fetch titles for a list of OpenAlex work IDs."""
    results = []
    if not ref_openalex_ids:
        return results
    
    # Batch by groups of 50 using filter id:...|id:...
    batch_size = 50
    for i in range(0, len(ref_openalex_ids), batch_size):
        batch = ref_openalex_ids[i:i+batch_size]
        id_filter = "|".join(batch)
        try:
            params = {
                "filter": f"ids.openalex:{id_filter}",
                "per-page": batch_size,
                "select": "id,display_name,publication_year,doi,authorships",
            }
            resp = httpx.get(OPENALEX_API_URL, params=params, timeout=15, headers={"User-Agent": "MathLiteratureHub/0.1.0"})
            resp.raise_for_status()
            data = resp.json()
            for item in data.get("results", []):
                authors = []
                for auth in item.get("authorships", []) or []:
                    name = auth.get("author", {}).get("display_name", "")
                    if name:
                        authors.append(name)
                results.append({
                    "title": item.get("display_name") or "",
                    "year": item.get("publication_year"),
                    "doi": item.get("doi", ""),
                    "authors": authors,
                })
            time.sleep(0.2)
        except Exception:
            continue
    
    return results


def batch_enrich(papers: List[models.Paper], db: Session):
    """Enrich a batch of papers with citation data."""
    for paper in papers:
        enrich_paper_citations(paper, db)
