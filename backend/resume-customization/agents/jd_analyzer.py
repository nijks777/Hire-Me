"""
JD Analyzer Agent
Analyzes job description and custom instructions
"""
import os
from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langsmith import traceable
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from state import ResumeCustomizationState, JDAnalysis


class JDAnalyzerAgent:
    """
    Agent responsible for analyzing job descriptions and custom instructions
    """

    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            api_key=os.getenv("OPENAI_API_KEY"),
            tags=["resume-customization", "jd-analysis"],
            metadata={"agent": "jd_analyzer", "system": "resume-customization"}
        )

    def analyze(self, state: ResumeCustomizationState) -> Dict[str, Any]:
        """
        Analyze the job description and extract key information
        """
        job_description = state["job_description"]
        custom_instructions = state.get("custom_instructions", "")

        system_prompt = """You are an expert job description analyzer.
Your task is to analyze job descriptions and extract key information that will be used to customize resumes.

Extract and return the following in a structured format:
1. Key requirements (must-haves)
2. Required technical skills
3. Preferred/nice-to-have skills
4. Experience level (junior, mid, senior, staff, etc.)
5. Job title
6. Company focus areas
7. Important keywords for ATS optimization

Also analyze any custom instructions provided by the user.

Return your analysis in valid JSON format with these keys:
- key_requirements (array of strings)
- required_skills (array of strings)
- preferred_skills (array of strings)
- experience_level (string)
- job_title (string)
- company_focus (string)
- keywords (array of strings)
- custom_instructions_parsed (string - summary of custom instructions)
"""

        user_prompt = f"""
Job Description:
{job_description}

{'Custom Instructions from User:' if custom_instructions else ''}
{custom_instructions if custom_instructions else ''}

Please analyze this job description and provide a structured JSON response.
"""

        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]

            response = self.llm.invoke(messages)

            # Parse the response
            import json
            # Extract JSON from response (handle markdown code blocks)
            response_text = response.content
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            analysis_data = json.loads(response_text)

            # Create JDAnalysis object
            jd_analysis = JDAnalysis(**analysis_data)

            return {
                "jd_analysis": jd_analysis,
                "current_agent": "jd_analyzer",
                "errors": []
            }

        except Exception as e:
            return {
                "jd_analysis": None,
                "current_agent": "jd_analyzer",
                "errors": [f"JD Analyzer Error: {str(e)}"]
            }


@traceable(name="jd_analyzer_node", run_type="chain", tags=["resume-customization", "jd-analysis"])
def jd_analyzer_node(state: ResumeCustomizationState) -> Dict[str, Any]:
    """
    LangGraph node for JD analysis
    """
    agent = JDAnalyzerAgent()
    return agent.analyze(state)
