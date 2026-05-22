from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import schemas, models
from app.services.unified_search import perform_search
from app.services.subject_config import list_subjects, list_subfields, SUBJECT_CONFIG
from app.routers.settings import get_or_create_settings

router = APIRouter()

@router.post("/", response_model=List[schemas.PaperResponse])
def perform_search_endpoint(req: schemas.SearchRequest, db: Session = Depends(get_db)):
    try:
        setting = get_or_create_settings(db)
        default_subject = setting.preferred_subject or "数学"
        default_subfield = setting.preferred_subfield or "动力系统"
        papers = perform_search(
            conditions=req.conditions,
            date_preset=req.date_preset,
            date_from=req.date_from,
            date_to=req.date_to,
            sources=req.sources,
            db=db,
            default_subject=default_subject,
            default_subfield=default_subfield,
        )
        return papers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subjects", response_model=schemas.SubjectInfo)
def get_subjects():
    subjects = list_subjects()
    subfields = {s: list_subfields(s) for s in subjects}
    return schemas.SubjectInfo(subjects=subjects, subfields=subfields)
