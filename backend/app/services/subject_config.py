"""Subject and subfield mappings to external database classification codes."""

# Maps (subject, subfield) -> source-specific classification codes
SUBJECT_CONFIG = {
    "数学": {
        "动力系统": {
            "arxiv": "math.DS",
            "zbmath_msc": "37",
            "mathscinet_msc": "37",
        },
        "代数几何": {
            "arxiv": "math.AG",
            "zbmath_msc": "14",
            "mathscinet_msc": "14",
        },
        "微分方程": {
            "arxiv": "math.CA",
            "zbmath_msc": "34",
            "mathscinet_msc": "34",
        },
        "概率论与随机过程": {
            "arxiv": "math.PR",
            "zbmath_msc": "60",
            "mathscinet_msc": "60",
        },
        "数值分析": {
            "arxiv": "math.NA",
            "zbmath_msc": "65",
            "mathscinet_msc": "65",
        },
        "组合数学": {
            "arxiv": "math.CO",
            "zbmath_msc": "05",
            "mathscinet_msc": "05",
        },
    },
    "经济学": {
        "一般经济学": {
            "arxiv": "econ.GN",
            "zbmath_msc": "91",
            "mathscinet_msc": "91",
        },
    },
    "物理学": {
        "数学物理": {
            "arxiv": "math-ph",
            "zbmath_msc": "81",
            "mathscinet_msc": "81",
        },
    },
}


def get_classification(subject: str, subfield: str, source: str) -> str | None:
    """Get classification code for a given subject/subfield and data source.

    source should be one of: arxiv, zbmath_msc, mathscinet_msc
    """
    subject_data = SUBJECT_CONFIG.get(subject)
    if not subject_data:
        return None
    subfield_data = subject_data.get(subfield)
    if not subfield_data:
        return None
    return subfield_data.get(source)


def list_subjects() -> list[str]:
    return list(SUBJECT_CONFIG.keys())


def list_subfields(subject: str) -> list[str]:
    subject_data = SUBJECT_CONFIG.get(subject)
    if not subject_data:
        return []
    return list(subject_data.keys())
