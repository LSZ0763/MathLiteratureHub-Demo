from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import schemas, models

router = APIRouter()

@router.get("/papers", response_model=List[schemas.PaperResponse])
def list_papers(db: Session = Depends(get_db)):
    return db.query(models.Paper).order_by(models.Paper.published_date.desc()).all()

