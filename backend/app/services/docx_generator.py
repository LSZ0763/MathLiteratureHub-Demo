import json
import os
from datetime import datetime, date as dt_date
from typing import List
from sqlalchemy.orm import Session
from app import models, schemas
from docx import Document
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
from docx.oxml.ns import qn


def _set_math_font(run, font_name="Cambria Math", size=11):
    """Set font for math-supporting text with CJK fallback."""
    font = run.font
    font.name = font_name
    run._element.rPr.rFonts.set(qn('w:eastAsia'), "Microsoft YaHei")
    font.size = Pt(size)


def _add_heading_math(doc, text, level=1):
    """Add heading with math font support."""
    heading = doc.add_heading(level=level)
    run = heading.add_run(text)
    _set_math_font(run, "Cambria Math", 16 if level == 1 else 14 if level == 2 else 12)
    heading.alignment = WD_PARAGRAPH_ALIGNMENT.LEFT if level > 0 else WD_PARAGRAPH_ALIGNMENT.CENTER
    return heading


def _add_paragraph_math(doc, text, bold=False, italic=False):
    """Add paragraph with math font support."""
    p = doc.add_paragraph()
    run = p.add_run(text)
    _set_math_font(run, "Cambria Math", 11)
    run.bold = bold
    run.italic = italic
    return p


def generate_docx(req: schemas.GenerateBriefingRequest, db: Session) -> models.Briefing:
    # Fetch papers with sorting
    query = db.query(models.Paper).filter(models.Paper.id.in_(req.paper_ids))
    papers = query.all()
    
    if not papers:
        raise ValueError("No papers found for briefing")
    
    # Apply sorting
    if req.sort_by:
        reverse = req.sort_order == "desc"
        if req.sort_by == "title":
            papers.sort(key=lambda p: (p.title or "").lower(), reverse=reverse)
        elif req.sort_by == "author":
            papers.sort(key=lambda p: (p.authors or "").lower(), reverse=reverse)
        elif req.sort_by == "citation_count":
            papers.sort(key=lambda p: p.citation_count or 0, reverse=reverse)
        elif req.sort_by == "date":
            papers.sort(key=lambda p: p.published_date or dt_date.min, reverse=reverse)
        elif req.sort_by == "journal":
            papers.sort(key=lambda p: (p.journal or "").lower(), reverse=reverse)
    
    # Build doc
    doc = Document()
    
    # Set default font for document
    style = doc.styles['Normal']
    style.font.name = 'Cambria Math'
    style._element.rPr.rFonts.set(qn('w:eastAsia'), 'Cambria Math')
    
    # Title
    title = req.title or f"文献综述简报 - {datetime.now().strftime('%Y-%m-%d')}"
    heading = doc.add_heading(title, level=0)
    heading.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    for run in heading.runs:
        _set_math_font(run, "Cambria Math", 20)
    
    doc.add_paragraph()
    
    # Table of Contents
    toc_heading = _add_heading_math(doc, "目录", level=1)
    toc_heading.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    for idx, paper in enumerate(papers, 1):
        toc_text = f"{idx}. {paper.title or '(无标题)'}"
        p = doc.add_paragraph(toc_text, style='List Number')
        for run in p.runs:
            _set_math_font(run, "Cambria Math", 11)
    
    doc.add_page_break()
    
    # Body
    for idx, paper in enumerate(papers, 1):
        # Paper heading
        paper_title = f"{idx}. {paper.title or '(无标题)'}"
        _add_heading_math(doc, paper_title, level=2)
        
        # Authors
        authors = ""
        try:
            authors = ", ".join(json.loads(paper.authors or "[]"))
        except Exception:
            authors = paper.authors or ""
        _add_paragraph_math(doc, f"作者：{authors}", bold=True)
        
        # Journal/Source
        if paper.journal:
            _add_paragraph_math(doc, f"杂志：{paper.journal}")
        elif paper.source:
            _add_paragraph_math(doc, f"来源：{paper.source}")
        
        # Date
        if paper.published_date:
            _add_paragraph_math(doc, f"发表日期：{paper.published_date}")
        
        # DOI
        if paper.doi:
            _add_paragraph_math(doc, f"DOI：{paper.doi}")
        
        # Link
        if paper.pdf_link:
            _add_paragraph_math(doc, f"链接：{paper.pdf_link}")
        
        # Citation / Reference counts
        meta_text = f"参考文献数量：{paper.reference_count or 0}  |  被引用数量：{paper.citation_count or 0}"
        _add_paragraph_math(doc, meta_text)
        
        # Keywords
        if paper.keywords:
            try:
                kw_list = json.loads(paper.keywords)
                if kw_list:
                    _add_paragraph_math(doc, f"关键词：{', '.join(kw_list)}")
            except Exception:
                pass
        
        # Abstract
        _add_heading_math(doc, "摘要", level=3)
        _add_paragraph_math(doc, paper.summary_raw or "（暂无摘要）")
        
        # References
        if paper.refs:
            try:
                refs = json.loads(paper.refs)
                if refs and len(refs) > 0:
                    _add_heading_math(doc, "参考文献", level=3)
                    for ref in refs:
                        if isinstance(ref, dict):
                            ref_text = ref.get("title", "")
                            if ref.get("authors"):
                                ref_authors = ", ".join(ref["authors"]) if isinstance(ref["authors"], list) else str(ref["authors"])
                                ref_text = f"{ref_authors}. {ref_text}"
                            if ref.get("year"):
                                ref_text += f" ({ref['year']})"
                            if ref.get("doi"):
                                ref_text += f" [DOI: {ref['doi']}]"
                            _add_paragraph_math(doc, f"• {ref_text}")
                        else:
                            _add_paragraph_math(doc, f"• {str(ref)}")
            except Exception:
                pass
        
        doc.add_paragraph()
    
    # Save
    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "briefings"))
    os.makedirs(output_dir, exist_ok=True)
    filename = f"briefing_{datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"
    filepath = os.path.join(output_dir, filename)
    doc.save(filepath)
    
    briefing = models.Briefing(
        title=title,
        format="docx",
        file_path=filepath,
        paper_ids=json.dumps(req.paper_ids),
    )
    db.add(briefing)
    db.commit()
    db.refresh(briefing)
    return briefing
