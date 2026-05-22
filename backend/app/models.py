from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class Paper(Base):
    __tablename__ = "papers"
    id = Column(Integer, primary_key=True, index=True)
    arxiv_id = Column(String, unique=True, index=True)
    title = Column(Text, nullable=False)
    authors = Column(Text)  # JSON list
    published_date = Column(Date)
    summary_raw = Column(Text)
    doi = Column(String)
    pdf_link = Column(String)
    source = Column(String, default="arxiv")
    created_at = Column(DateTime, server_default=func.now())
    
    # 新增字段
    journal = Column(String)
    keywords = Column(Text)  # JSON list
    citation_count = Column(Integer, default=0)
    reference_count = Column(Integer, default=0)
    refs = Column(Text)  # JSON list of {title, authors, year, doi}

class Briefing(Base):
    __tablename__ = "briefings"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    date_from = Column(Date)
    date_to = Column(Date)
    format = Column(String)
    file_path = Column(String)
    paper_ids = Column(Text)  # JSON list
    created_at = Column(DateTime, server_default=func.now())

class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    run_mode = Column(String, default="manual")
    auto_interval_days = Column(Integer, default=7)
    smtp_config = Column(Text)  # JSON
    preferred_subject = Column(String, default="数学")
    preferred_subfield = Column(String, default="动力系统")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Keyword(Base):
    __tablename__ = "keywords"
    id = Column(Integer, primary_key=True, index=True)
    term = Column(String, nullable=False)
    logic = Column(String, default="AND")  # AND / OR / NOT
    created_at = Column(DateTime, server_default=func.now())
