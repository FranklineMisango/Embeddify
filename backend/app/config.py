from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    deepseek_api_key: str = ""
    openai_api_key: str = ""
    llm_provider: str = "deepseek"  # "deepseek" | "openai"
    database_url: str = "postgresql://user:password@localhost:5432/cvmatcher"
    redis_url: str = "redis://localhost:6379"
    google_search_api_key: str = ""
    google_search_engine_id: str = ""

    class Config:
        env_file = str(Path(__file__).parent.parent / ".env")

settings = Settings()
