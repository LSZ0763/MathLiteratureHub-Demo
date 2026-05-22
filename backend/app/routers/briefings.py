from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import schemas, models
from app.services.docx_generator import generate_docx

router = APIRouter()


@router.post("/", response_model=schemas.BriefingResponse)
def create_briefing(req: schemas.GenerateBriefingRequest, db: Session = Depends(get_db)):
    try:
        briefing = generate_docx(req, db)
        return briefing
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[schemas.BriefingResponse])
def list_briefings(db: Session = Depends(get_db)):
    return db.query(models.Briefing).order_by(models.Briefing.created_at.desc()).all()

@router.get("/{briefing_id}/download")
def download_briefing(briefing_id: int, db: Session = Depends(get_db)):
    from fastapi.responses import FileResponse
    briefing = db.query(models.Briefing).filter(models.Briefing.id == briefing_id).first()
    if not briefing:
        raise HTTPException(status_code=404, detail="Briefing not found")
    return FileResponse(briefing.file_path, filename=briefing.title + ".docx")

@router.delete("/{briefing_id}")
def delete_briefing(briefing_id: int, db: Session = Depends(get_db)):
    import os
    briefing = db.query(models.Briefing).filter(models.Briefing.id == briefing_id).first()
    if not briefing:
        raise HTTPException(status_code=404, detail="Briefing not found")
    if briefing.file_path and os.path.exists(briefing.file_path):
        os.remove(briefing.file_path)
    db.delete(briefing)
    db.commit()
    return {"ok": True}
