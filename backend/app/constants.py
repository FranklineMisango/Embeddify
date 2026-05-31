"""Shared constants for Embeddify backend."""
VARIANT_LABELS = {
    "data_science": "Data Science",
    "quant": "Quant Research",
    "bi_sc": "BI / Supply Chain",
    "research": "Research",
    "full": "Full CV",
}

VARIANT_HINTS = {
    "quant": ["quant", "quantitative", "trading", "portfolio", "alpha", "risk", "derivatives", "research"],
    "research": ["research", "publication", "paper", "phd", "literature", "experiment", "academic"],
    "bi_sc": ["business intelligence", "supply chain", "operations", "forecast", "inventory", "power bi", "tableau"],
    "data_science": ["data science", "machine learning", "analytics", "model", "python", "sql", "experiment"],
    "full": ["leadership", "stakeholder", "cross-functional", "strategy", "delivery", "generalist"],
}
