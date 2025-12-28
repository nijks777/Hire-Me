"""
LangSmith Configuration and Utilities
Provides centralized LangSmith tracing setup for all agents
"""
import os
from functools import wraps
from typing import Any, Callable, Dict, Optional
from langsmith import traceable
from langsmith.wrappers import wrap_openai
from langchain_openai import ChatOpenAI


def get_traced_llm(
    model: str = "gpt-4o-mini",
    temperature: float = 0.3,
    tags: Optional[list] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> ChatOpenAI:
    """
    Create a ChatOpenAI instance with LangSmith tracing enabled

    Args:
        model: Model name (default: gpt-4o-mini)
        temperature: Temperature setting (default: 0.3)
        tags: Optional tags for LangSmith filtering
        metadata: Optional metadata for LangSmith tracking

    Returns:
        ChatOpenAI instance with tracing enabled
    """
    from app.config import settings

    llm = ChatOpenAI(
        model=model,
        temperature=temperature,
        api_key=settings.OPENAI_API_KEY,
        tags=tags or [],
        metadata=metadata or {}
    )

    return llm


def trace_agent(
    agent_name: str,
    run_type: str = "chain",
    tags: Optional[list] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Decorator to add LangSmith tracing to agent functions

    Args:
        agent_name: Name of the agent (e.g., "input_analyzer", "research_agent")
        run_type: Type of run ("chain", "llm", "tool", "retriever", "agent")
        tags: Optional tags for filtering in LangSmith
        metadata: Optional metadata for tracking

    Usage:
        @trace_agent("input_analyzer", tags=["job-application", "analysis"])
        def input_analyzer_agent(state: AgentState) -> AgentState:
            ...
    """
    def decorator(func: Callable) -> Callable:
        @traceable(
            name=agent_name,
            run_type=run_type,
            tags=tags or [],
            metadata=metadata or {}
        )
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Add agent name to kwargs if state is present
            result = func(*args, **kwargs)
            return result

        return wrapper
    return decorator


def trace_api_endpoint(
    endpoint_name: str,
    tags: Optional[list] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Decorator to add LangSmith tracing to API endpoints

    Args:
        endpoint_name: Name of the endpoint (e.g., "generate_stream", "test_step_1")
        tags: Optional tags for filtering in LangSmith
        metadata: Optional metadata for tracking

    Usage:
        @trace_api_endpoint("generate_stream", tags=["api", "streaming"])
        async def generate_stream(request: GenerateRequest):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @traceable(
            name=endpoint_name,
            run_type="chain",
            tags=tags or ["api"],
            metadata=metadata or {}
        )
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            return result

        return wrapper
    return decorator


# LangSmith configuration check
def is_langsmith_enabled() -> bool:
    """Check if LangSmith tracing is enabled via environment variables"""
    return os.getenv("LANGSMITH_TRACING", "false").lower() == "true"


def get_langsmith_project() -> str:
    """Get the LangSmith project name"""
    return os.getenv("LANGSMITH_PROJECT", "Hire-Me")


# Configuration check is now only done in langsmith_startup.py
# This prevents duplicate messages on import
