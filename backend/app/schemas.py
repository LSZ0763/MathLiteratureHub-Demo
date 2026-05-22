from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date, datetime

class PaperBase(BaseModel):
    title: str
    authors: Optional[str] = None
    published_date: Optional[date] = None
    summary_raw: Optional[str] = None
    doi: Optional[str] = None
    pdf_link: Optional[str] = None
    source: str = "arxiv"
    arxiv_id: Optional[str] = None
    journal: Optional[str] = None
    keywords: Optional[str] = None
    citation_count: int = 0
    reference_count: int = 0
    refs: Optional[str] = None

class PaperCreate(PaperBase):
    pass

class PaperResponse(PaperBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None

class BriefingBase(BaseModel):
    title: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    format: str = "docx"
    file_path: Optional[str] = None
    paper_ids: Optional[str] = None

class BriefingCreate(BriefingBase):
    pass

class BriefingResponse(BriefingBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None

class SettingBase(BaseModel):
    run_mode: str = "manual"
    auto_interval_days: int = 7
    smtp_config: Optional[str] = None
    preferred_subject: Optional[str] = "数学"
    preferred_subfield: Optional[str] = "动力系统"

class SettingResponse(SettingBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    updated_at: Optional[datetime] = None

class KeywordBase(BaseModel):
    term: str
    logic: str = "AND"

class KeywordCreate(KeywordBase):
    pass

class KeywordResponse(KeywordBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None

class SearchCondition(BaseModel):
    field: str  # topic, author, source, doi, subject, subfield
    match: str = "fuzzy"  # exact, fuzzy
    value: str
    logic: str = "AND"  # AND, OR, NOT (relationship to next condition)

class SearchRequest(BaseModel):
    conditions: List[SearchCondition]
    date_preset: Optional[str] = None  # 7d, 14d, 30d, custom
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    sources: List[str] = ["arxiv", "zbmath"]

class FilterCondition(BaseModel):
    field: str  # topic, author, source, doi, subject, subfield, citation_count
    match: str = "fuzzy"
    value: str
    logic: str = "AND"

class FilterRequest(BaseModel):
    paper_ids: List[int]
    conditions: List[FilterCondition]
    sort_by: Optional[str] = None  # title, author, citation_count, date, journal
    sort_order: Optional[str] = "desc"  # asc, desc
    custom_order: Optional[List[int]] = None  # 用户自定义排序的paper id列表

class GenerateBriefingRequest(BaseModel):
    paper_ids: List[int]
    format: str = "docx"
    title: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = "desc"

class SubjectInfo(BaseModel):
    subjects: List[str]
    subfields: dict[str, List[str]]
