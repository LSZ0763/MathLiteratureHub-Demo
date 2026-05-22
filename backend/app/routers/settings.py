from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import schemas, models

router = APIRouter()

def get_or_create_settings(db: Session):
    setting = db.query(models.Setting).first()
    if not setting:
        setting = models.Setting()
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting

@router.get("/", response_model=schemas.SettingResponse)
def read_settings(db: Session = Depends(get_db)):
    setting = get_or_create_settings(db)
    return schemas.SettingResponse.model_validate(setting)

@router.put("/", response_model=schemas.SettingResponse)
def update_settings(data: schemas.SettingBase, db: Session = Depends(get_db)):
    setting = get_or_create_settings(db)
    for field, value in data.model_dump().items():
        setattr(setting, field, value)
    db.commit()
    db.refresh(setting)
    return setting

@router.get("/keywords", response_model=List[schemas.KeywordResponse])
def list_keywords(db: Session = Depends(get_db)):
    return db.query(models.Keyword).order_by(models.Keyword.created_at.desc()).all()

@router.post("/keywords", response_model=schemas.KeywordResponse)
def add_keyword(data: schemas.KeywordCreate, db: Session = Depends(get_db)):
    kw = models.Keyword(**data.model_dump())
    db.add(kw)
    db.commit()
    db.refresh(kw)
    return kw

@router.delete("/keywords/{keyword_id}")
def delete_keyword(keyword_id: int, db: Session = Depends(get_db)):
    kw = db.query(models.Keyword).filter(models.Keyword.id == keyword_id).first()
    if not kw:
        raise HTTPException(status_code=404, detail="Keyword not found")
    db.delete(kw)
    db.commit()
    return {"ok": True}
