"""LLM client — DeepSeek by default, OpenAI as fallback."""
from openai import AsyncOpenAI, AuthenticationError
from app.config import settings


class LLMConfigurationError(RuntimeError):
    """Raised when the configured provider cannot authenticate the request."""

def get_client() -> AsyncOpenAI:
    if settings.llm_provider == "openai":
        if not settings.openai_api_key.strip():
            raise LLMConfigurationError("OpenAI API key is missing. Set OPENAI_API_KEY or switch LLM_PROVIDER to deepseek.")
        return AsyncOpenAI(api_key=settings.openai_api_key)
    # DeepSeek is OpenAI-compatible
    if not settings.deepseek_api_key.strip():
        raise LLMConfigurationError("DeepSeek API key is missing. Set DEEPSEEK_API_KEY or switch LLM_PROVIDER to openai.")
    return AsyncOpenAI(
        api_key=settings.deepseek_api_key,
        base_url="https://api.deepseek.com/v1",
    )

MODEL_MAP = {
    "deepseek": "deepseek-chat",
    "openai": "gpt-4o",
}

async def chat(system: str, user: str) -> str:
    client = get_client()
    model = MODEL_MAP[settings.llm_provider]
    try:
        resp = await client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.3,
        )
    except AuthenticationError as exc:
        raise LLMConfigurationError(
            f"{settings.llm_provider.title()} API authentication failed. Replace the configured API key and restart the backend."
        ) from exc
    return resp.choices[0].message.content
