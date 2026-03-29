"""LLM client — DeepSeek by default, OpenAI as fallback."""
from openai import AsyncOpenAI
from app.config import settings

def get_client() -> AsyncOpenAI:
    if settings.llm_provider == "openai":
        return AsyncOpenAI(api_key=settings.openai_api_key)
    # DeepSeek is OpenAI-compatible
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
    resp = await client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.3,
    )
    return resp.choices[0].message.content
