"""
EduAllocPro — Gemini Orchestration Layer
Calls gemini_client — does NOT import raw Gemini SDK directly.
"""
from services.gemini_client import GeminiClient


async def generate_briefing(context: dict, gemini: GeminiClient) -> dict:
    """Generate district briefing via Gemini."""
    return await gemini.generate_briefing(context)


async def generate_deployment_order(deployment: dict, gemini: GeminiClient) -> str:
    """Generate deployment order narrative via Gemini."""
    return await gemini.generate_order_draft(deployment)


async def generate_escalation_assessment(school: dict, gemini: GeminiClient) -> dict:
    """Generate escalation assessment — only called if DI > 85."""
    return await gemini.generate_escalation_assessment(school)
