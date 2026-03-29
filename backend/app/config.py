from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    deepseek_api_key: str = ""
    openai_api_key: str = ""
    llm_provider: str = "deepseek"  # "deepseek" | "openai"
    database_url: str = "postgresql://user:password@localhost:5432/cvmatcher"
    redis_url: str = "redis://localhost:6379"

    class Config:
        env_file = ".env"

settings = Settings()
