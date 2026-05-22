from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from app.database import get_db
from app import schemas, models

router = APIRouter()


@router.post("/", response_model=List[schemas.PaperResponse])
def filter_papers(req: schemas.FilterRequest, db: Session = Depends(get_db)):
    """Filter and sort a list of papers."""
    try:
        papers = db.query(models.Paper).filter(models.Paper.id.in_(req.paper_ids)).all()
        
        # Apply text filters
        if req.conditions:
            filtered = []
            for paper in papers:
                match = True
                for cond in req.conditions:
                    val = cond.value.strip().lower()
                    if not val:
                        continue
                    field_val = ""
                    if cond.field == "topic":
                        field_val = (paper.title or "") + " " + (paper.summary_raw or "")
                    elif cond.field == "author":
                        field_val = paper.authors or ""
                    elif cond.field == "source":
                        field_val = paper.source or ""
                        if paper.journal:
                            field_val += " " + paper.journal
                    elif cond.field == "doi":
                        field_val = paper.doi or ""
                    elif cond.field == "subject":
                        field_val = paper.keywords or ""
                    elif cond.field == "subfield":
                        field_val = paper.keywords or ""
                    elif cond.field == "citation_count":
                        # numeric filter
                        try:
                            target = int(val)
                            paper_citations = paper.citation_count or 0
                            if cond.match == "exact":
                                cond_match = paper_citations == target
                            elif cond.match == "gte":
                                cond_match = paper_citations >= target
                            elif cond.match == "lte":
                                cond_match = paper_citations <= target
                            else:
                                cond_match = paper_citations == target
                        except ValueError:
                            cond_match = False
                        if cond.logic == "NOT":
                            match = match and (not cond_match)
                        else:
                            match = match and cond_match
                        continue
                    
                    field_val = field_val.lower()
                    if cond.match == "exact":
                        cond_match = val in field_val
                    else:
                        cond_match = val in field_val
                    
                    if cond.logic == "NOT":
                        match = match and (not cond_match)
                    else:
                        match = match and cond_match
                
                if match:
                    filtered.append(paper)
            papers = filtered
        
        # Sorting
        if req.custom_order:
            order_map = {pid: idx for idx, pid in enumerate(req.custom_order)}
            papers.sort(key=lambda p: order_map.get(p.id, 999999))
        elif req.sort_by:
            reverse = req.sort_order == "desc"
            if req.sort_by == "title":
                papers.sort(key=lambda p: (p.title or "").lower(), reverse=reverse)
            elif req.sort_by == "author":
                papers.sort(key=lambda p: (p.authors or "").lower(), reverse=reverse)
            elif req.sort_by == "citation_count":
                papers.sort(key=lambda p: p.citation_count or 0, reverse=reverse)
            elif req.sort_by == "date":
                papers.sort(key=lambda p: p.published_date or date.min, reverse=reverse)
            elif req.sort_by == "journal":
                papers.sort(key=lambda p: (p.journal or "").lower(), reverse=reverse)
        
        return papers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
