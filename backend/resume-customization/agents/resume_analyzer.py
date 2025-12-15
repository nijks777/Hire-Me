"""
Resume Analyzer Agent
Analyzes the user's current resume
"""
import os
import sys
from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langsmith import traceable

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from state import ResumeCustomizationState, ResumeAnalysis


class ResumeAnalyzerAgent:
    """
    Agent responsible for analyzing the user's current resume
    """

    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            api_key=os.getenv("OPENAI_API_KEY"),
            tags=["resume-customization", "resume-analysis"],
            metadata={"agent": "resume_analyzer", "system": "resume-customization"}
        )

    def analyze(self, state: ResumeCustomizationState) -> Dict[str, Any]:
        """
        Analyze the resume and extract structured information
        """
        resume_data = state["resume_data"]
        resume_file_name = state["resume_file_name"]

        # For now, we'll use a simple text extraction
        # In production, you'd use a PDF parser like PyPDF2 or pdfplumber
        resume_text = f"Resume file: {resume_file_name}\n[Resume content would be extracted here]"

        system_prompt = """You are an expert resume analyzer.
Your task is to analyze resumes and extract structured information that will be used for customization.

Extract and return the following in a structured format:
1. Current skills (technical and soft skills)
2. Work experiences (with company, role, and key achievements)
3. Key achievements and accomplishments
4. Notable projects
5. Education background
6. Overall resume structure and format type

Return your analysis in valid JSON format with these keys:
- current_skills (array of strings)
- experiences (array of objects with: company, role, duration, achievements)
- achievements (array of strings)
- projects (array of strings)
- education (array of objects with: degree, field, institution, year)
- structure (string - description of resume structure)
- format_type (string - chronological, functional, combination, etc.)
"""

        user_prompt = f"""
Please analyze this resume:

{resume_text}

Note: This is a test. For demonstration, create a sample analysis assuming this is a senior software engineer's resume with experience in full-stack development, React, Node.js, AWS, and leadership.

Provide a structured JSON response.
"""

        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]

            response = self.llm.invoke(messages)

            # Parse the response
            import json
            response_text = response.content
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            analysis_data = json.loads(response_text)

            # Create ResumeAnalysis object
            resume_analysis = ResumeAnalysis(**analysis_data)

            return {
                "resume_analysis": resume_analysis,
                "current_agent": "resume_analyzer",
                "errors": []
            }

        except Exception as e:
            return {
                "resume_analysis": None,
                "current_agent": "resume_analyzer",
                "errors": [f"Resume Analyzer Error: {str(e)}"]
            }


@traceable(name="resume_analyzer_node", run_type="chain", tags=["resume-customization", "resume-analysis"])
def resume_analyzer_node(state: ResumeCustomizationState) -> Dict[str, Any]:
    """
    LangGraph node for Resume analysis
    """
    agent = ResumeAnalyzerAgent()
    return agent.analyze(state)
