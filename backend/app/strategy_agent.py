"""LangGraph-based CV Strategy Agent using ReAct pattern."""
import json
import asyncio
from typing import Any
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from app.llm import get_client, MODEL_MAP
from app.config import settings
from app.routers.cv import (
    _select_reference_variant,
    _truncate,
)
from app.constants import VARIANT_LABELS
from app.routers.job_search import search_google_jobs


# ============================================================================
# HELPER FUNCTIONS (Core Logic)
# ============================================================================

def _select_best_variant(target_role: str, cv_text: str) -> dict[str, Any]:
    """Select the best reference template variant for the target role."""
    variant, scores = _select_reference_variant(target_role, cv_text)
    label = VARIANT_LABELS.get(variant, variant)
    return {
        "variant": variant,
        "label": label,
        "scores": {k: v for k, v in scores.items()},
    }


def _source_item_to_text(item: Any) -> str:
    """Normalize tool payload items before inserting them into a prompt."""
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        title = str(item.get("title", "")).strip()
        company = str(item.get("company", "")).strip()
        url = str(item.get("url", "")).strip()
        snippet = str(item.get("snippet", item.get("description", ""))).strip()
        parts = [part for part in (title, company, url, snippet) if part]
        return " | ".join(parts) if parts else json.dumps(item, ensure_ascii=True)
    return str(item)


async def _fetch_job_data(
    target_role: str, location: str, seniority: str, num_results: int = 5
) -> dict[str, Any]:
    """Fetch job requirements from Google Custom Search API."""
    query = f"{seniority if seniority != 'any' else ''} {target_role}".strip()
    
    try:
        job_results = await search_google_jobs(query, location, num_results=num_results)
    except Exception as exc:
        print(f"[DEBUG] Job requirement lookup failed: {exc}")
        job_results = []

    job_requirement_lines: list[str] = []
    job_source_blocks: list[str] = []
    for idx, job in enumerate(job_results[:num_results], start=1):
        source_id = f"job_req_{idx}"
        title = job.get("title", "").strip()
        company = job.get("company", "").strip()
        snippet = _truncate(job.get("snippet", ""), 280)
        job_requirement_lines.append(f"{idx}. {title} | {company} | {snippet}")
        job_source_blocks.append(
            f"[{source_id}] {title} ({company})\nURL: {job.get('url', '')}\nSnippet: {snippet}"
        )

    return {
        "job_sources": job_source_blocks if job_source_blocks else ["No job snippets were retrieved."],
        "job_requirements": job_requirement_lines,
        "job_count": len(job_results),
    }


async def _synthesize_strategy_analysis(
    target_role: str,
    cv_text: str,
    reference_variant: str,
    reference_template: str,
    job_sources_json: str,
    location: str,
    seniority: str,
) -> dict[str, Any]:
    """Synthesize a deep target-role strategy using all collected sources."""
    from app.llm import chat

    cv_excerpt = _truncate(cv_text, 2600)
    template_excerpt = _truncate(reference_template, 800)
    reference_label = VARIANT_LABELS.get(reference_variant, reference_variant)

    # Parse job sources
    try:
        job_data = json.loads(job_sources_json)
        job_source_blocks = [
            _source_item_to_text(item) for item in job_data.get("job_sources", [])
        ]
        job_requirement_lines = [
            _source_item_to_text(item) for item in job_data.get("job_requirements", [])
        ]
    except Exception:
        job_source_blocks = ["No job snippets were retrieved."]
        job_requirement_lines = []

    # Build variant scores
    _, variant_scores = _select_reference_variant(target_role, cv_text)
    variant_scoring = "\n".join(f"- {name}: {score}" for name, score in variant_scores.items())

    source_pack = f"""[current_resume]
{cv_excerpt}

[reference_template]
Variant: {reference_variant} ({reference_label})
Focus: {template_excerpt}

[job_requirements]
{chr(10).join(job_source_blocks)}
"""

    system_prompt = """You are a senior CV strategy agent.
Your task is to produce a deep, evidence-backed target-role strategy using the provided sources.
Use only the provided source pack, cite it explicitly in the evidence items, and return only valid JSON.
"""

    user_prompt = f"""TARGET ROLE: {target_role}
LOCATION: {location}
SENIORITY: {seniority}

VARIANT SCORES:
{variant_scoring}

SOURCE PACK:
{source_pack}

Return ONLY a JSON object with this shape:
{{
  "targetRole": "{target_role}",
  "bestTemplateVariant": "data_science|quant|bi_sc|research|full",
  "bestTemplateLabel": "human readable template label",
  "variantRationale": "why the template is the closest reference for the target role",
  "resumeSentiment": {{"tone": "positive|mixed|gap-heavy|neutral", "confidence": 0, "notes": "..."}},
  "marketSentiment": {{"tone": "strong|competitive|niche|uncertain", "confidence": 0, "notes": "..."}},
  "focusNotes": ["3-7 concise and actionable focus notes"],
  "targetRecommendation": "a clear target recommendation for the user",
  "similarResumeSignals": ["signals seen in the reference template that the user should emulate"],
  "jobRequirements": ["the most important job requirements surfaced from the job snippets"],
  "evidence": [
    {{"sourceId": "current_resume", "quote": "short exact quote from current resume", "whyItMatters": "..."}},
    {{"sourceId": "reference_template", "quote": "short exact quote from the reference template", "whyItMatters": "..."}},
    {{"sourceId": "job_req_1", "quote": "short exact quote from a job snippet", "whyItMatters": "..."}}
  ],
  "actionPlan": ["3-6 concrete next steps"],
  "caveats": ["1-4 cautionary notes or limitations"]
}}

Rules:
- focusNotes, similarResumeSignals, jobRequirements, actionPlan, and caveats must be arrays of strings.
- evidence must be an array of objects with sourceId, quote, and whyItMatters fields.
- Keep the analysis practical, specific, and grounded in the source pack.
- If no job snippets were found, say so in marketSentiment and caveats.
"""

    response = await chat(system_prompt, user_prompt)

    try:
        cleaned_response = response.strip()
        if cleaned_response.startswith("```"):
            if "```json" in cleaned_response:
                cleaned_response = cleaned_response.split("```json")[1].split("```")[0].strip()
            else:
                cleaned_response = cleaned_response.split("```")[1].split("```")[0].strip()

        strategy = json.loads(cleaned_response)

        # Ensure all fields are present and properly typed
        strategy["targetRole"] = strategy.get("targetRole", target_role)
        strategy["bestTemplateVariant"] = strategy.get("bestTemplateVariant", reference_variant)
        strategy["bestTemplateLabel"] = strategy.get("bestTemplateLabel", reference_label)
        strategy["variantRationale"] = strategy.get(
            "variantRationale", f"Closest reference template for {target_role}."
        )
        strategy["focusNotes"] = [str(item) for item in strategy.get("focusNotes", [])][:7]
        strategy["similarResumeSignals"] = [
            str(item) for item in strategy.get("similarResumeSignals", [])
        ][:7]
        strategy["jobRequirements"] = [
            str(item) for item in strategy.get("jobRequirements", [])
        ][:10]
        strategy["actionPlan"] = [str(item) for item in strategy.get("actionPlan", [])][:6]
        strategy["caveats"] = [str(item) for item in strategy.get("caveats", [])][:4]

        if not isinstance(strategy.get("resumeSentiment"), dict):
            strategy["resumeSentiment"] = {"tone": "neutral", "confidence": 0, "notes": "No sentiment was returned."}
        if not isinstance(strategy.get("marketSentiment"), dict):
            strategy["marketSentiment"] = {"tone": "uncertain", "confidence": 0, "notes": "No market sentiment was returned."}
        if not isinstance(strategy.get("evidence"), list):
            strategy["evidence"] = []

        if not strategy["jobRequirements"] and job_requirement_lines:
            strategy["jobRequirements"] = job_requirement_lines[:10]

        return strategy

    except json.JSONDecodeError as e:
        print(f"[ERROR] Strategy JSON parsing failed: {response}")
        print(f"JSON Error: {e}")
        raise Exception(f"Strategy analysis failed: {str(e)}")


# ============================================================================
# LANGGRAPH TOOLS (Wrapped for Agent)
# ============================================================================

@tool
def select_variant(target_role: str, cv_text: str) -> str:
    """
    Select the best reference template variant for the target role.
    Returns a JSON string with variant, label, and scoring rationale.
    """
    result = _select_best_variant(target_role, cv_text)
    return json.dumps(result)


@tool
async def fetch_job_requirements(
    target_role: str, location: str, seniority: str, num_results: int = 5
) -> str:
    """
    Fetch job requirements from Google Custom Search API.
    Returns a JSON string with job snippets and requirement lines.
    """
    result = await _fetch_job_data(target_role, location, seniority, num_results)
    return json.dumps(result)


@tool
async def synthesize_strategy(
    target_role: str,
    cv_text: str,
    reference_variant: str,
    reference_template: str,
    job_sources_json: str,
    location: str,
    seniority: str,
) -> str:
    """
    Synthesize a deep target-role strategy using all collected sources.
    Returns a JSON string with the full strategy analysis.
    """
    result = await _synthesize_strategy_analysis(
        target_role, cv_text, reference_variant, reference_template,
        job_sources_json, location, seniority
    )
    return json.dumps(result)


# ============================================================================
# LANGGRAPH AGENT CREATION
# ============================================================================

async def create_strategy_agent():
    """Create a ReAct agent for CV strategy orchestration."""
    tools = [select_variant, fetch_job_requirements, synthesize_strategy]

    # Initialize LLM based on settings
    if settings.llm_provider == "openai":
        llm = ChatOpenAI(
            model="gpt-4o",
            api_key=settings.openai_api_key,
            temperature=0.3,
        )
    else:
        # DeepSeek
        llm = ChatOpenAI(
            model="deepseek-chat",
            api_key=settings.deepseek_api_key,
            base_url="https://api.deepseek.com/v1",
            temperature=0.3,
        )

    # Create ReAct agent
    agent = create_react_agent(llm, tools=tools)
    return agent


# ============================================================================
# WORKFLOW ORCHESTRATION
# ============================================================================

async def run_strategy_workflow(
    target_role: str, cv_text: str, location: str, seniority: str
) -> dict[str, Any]:
    """
    Run the strategy workflow using LangGraph ReAct agent.
    The agent orchestrates: variant selection → job fetching → strategy synthesis.
    Returns the final strategy analysis.
    """
    agent = await create_strategy_agent()

    # Pre-fetch data needed for the agent prompt
    variant_data = _select_best_variant(target_role, cv_text)
    reference_variant = variant_data["variant"]
    reference_label = VARIANT_LABELS.get(reference_variant, reference_variant)
    
    # Use variant description instead of loading .tex file
    reference_template = f"Reference template: {reference_label} variant - focus on {reference_variant} expertise"
    
    job_data = await _fetch_job_data(target_role, location, seniority, num_results=5)

    # Build agent prompt to orchestrate the full workflow
    user_message = f"""
You are a CV strategy orchestration agent. Your task is to generate a comprehensive, evidence-backed strategy for the target role.

TARGET ROLE: {target_role}
LOCATION: {location}
SENIORITY: {seniority}
REFERENCE VARIANT: {reference_variant} ({reference_label})

CV (excerpt):
{_truncate(cv_text, 1000)}

Job Market Data:
{json.dumps(job_data, indent=2)[:1500]}

INSTRUCTION: Call the synthesize_strategy tool with all required parameters to produce the final JSON strategy.
Return ONLY the JSON output from the tool, no additional text or explanation."""

    inputs = {"messages": [("user", user_message)]}

    # Run agent with streaming to capture all tool invocations
    final_response = None
    iteration_count = 0
    max_iterations = 10  # Safety limit
    
    async for event in agent.astream(inputs, stream_mode="values"):
        final_response = event
        iteration_count += 1
        if iteration_count >= max_iterations:
            print(f"[WARN] Agent reached max iterations ({max_iterations})")
            break

    # Extract strategy from agent's final response
    if final_response and "messages" in final_response:
        messages = final_response["messages"]
        last_message = messages[-1] if messages else None
        
        if hasattr(last_message, "content"):
            content = last_message.content
            print(f"[DEBUG] Agent final response length: {len(str(content))}")
            
            if isinstance(content, str):
                # Try to extract JSON from the response
                try:
                    # Look for JSON object in the response
                    if "{" in content and "}" in content:
                        json_start = content.find("{")
                        json_end = content.rfind("}") + 1
                        json_str = content[json_start:json_end]
                        print(f"[DEBUG] Extracted JSON (first 200 chars): {json_str[:200]}")
                        strategy = json.loads(json_str)
                        print(f"[DEBUG] Agent JSON parsed successfully")
                        
                        return {
                            "status": "success",
                            "analysis": strategy,
                            "referenceVariant": reference_variant,
                            "referenceLabel": reference_label,
                            "jobSignals": job_data.get("job_sources", [])[:5],
                            "orchestrator": "langgraph-react",
                        }
                    else:
                        print(f"[DEBUG] No JSON object found in response")
                except json.JSONDecodeError as je:
                    print(f"[DEBUG] JSON decode error: {je}")
                except Exception as e:
                    print(f"[DEBUG] Failed to parse agent response: {e}")
            else:
                print(f"[DEBUG] Response is not string: {type(content)}")

    # Fallback: if agent response parsing fails, synthesize directly
    print("[DEBUG] Agent response parsing failed, falling back to direct synthesis")
    strategy = await _synthesize_strategy_analysis(
        target_role=target_role,
        cv_text=cv_text,
        reference_variant=reference_variant,
        reference_template=reference_template,
        job_sources_json=json.dumps(job_data),
        location=location,
        seniority=seniority,
    )

    return {
        "status": "success",
        "analysis": strategy,
        "referenceVariant": reference_variant,
        "referenceLabel": reference_label,
        "jobSignals": job_data.get("job_sources", [])[:5],
        "orchestrator": "fallback-direct",
    }

