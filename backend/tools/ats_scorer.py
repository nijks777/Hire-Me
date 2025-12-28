"""
ATS Scoring Tool
Analyzes resume for ATS compatibility and provides score
"""
from typing import Dict, List, Any
import re


class ATSScorer:
    """
    ATS (Applicant Tracking System) Resume Scorer
    Analyzes resume against job requirements for ATS compatibility
    """

    def __init__(self, threshold: float = 75.0):
        """
        Initialize ATS Scorer

        Args:
            threshold: Minimum passing score (default: 75.0)
        """
        self.threshold = threshold

    def calculate_keyword_match(self, resume: str, keywords: List[str]) -> Dict[str, Any]:
        """
        Calculate keyword match percentage

        Args:
            resume: Resume text
            keywords: List of ATS keywords to match

        Returns:
            Dictionary with match statistics
        """
        resume_lower = resume.lower()
        matched_keywords = []
        missing_keywords = []

        for keyword in keywords:
            keyword_lower = keyword.lower()
            # Check for exact match or word boundary match
            if re.search(r'\b' + re.escape(keyword_lower) + r'\b', resume_lower):
                matched_keywords.append(keyword)
            else:
                missing_keywords.append(keyword)

        match_percentage = (len(matched_keywords) / len(keywords) * 100) if keywords else 0

        return {
            "matched_keywords": matched_keywords,
            "missing_keywords": missing_keywords,
            "match_count": len(matched_keywords),
            "total_keywords": len(keywords),
            "match_percentage": round(match_percentage, 2)
        }

    def check_format_compliance(self, resume: str) -> Dict[str, Any]:
        """
        Check resume format for ATS compliance

        Args:
            resume: Resume text

        Returns:
            Dictionary with format compliance scores
        """
        issues = []
        scores = {}

        # Check for proper sections
        common_sections = ["experience", "education", "skills", "projects"]
        sections_found = sum(1 for section in common_sections if section in resume.lower())
        scores["sections_score"] = (sections_found / len(common_sections)) * 100

        if sections_found < len(common_sections):
            missing = [s for s in common_sections if s not in resume.lower()]
            issues.append(f"Missing sections: {', '.join(missing)}")

        # Check word count (ideal: 400-800 words)
        word_count = len(resume.split())
        if word_count < 300:
            scores["length_score"] = 50
            issues.append("Resume too short (< 300 words)")
        elif word_count > 1000:
            scores["length_score"] = 70
            issues.append("Resume too long (> 1000 words)")
        else:
            scores["length_score"] = 100

        # Check for bullet points (good for ATS)
        has_bullets = bool(re.search(r'[•\-\*]', resume))
        scores["formatting_score"] = 100 if has_bullets else 70
        if not has_bullets:
            issues.append("No bullet points found (recommended for ATS)")

        # Check for contact info
        has_email = bool(re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', resume))
        scores["contact_score"] = 100 if has_email else 50
        if not has_email:
            issues.append("No email address found")

        # Overall format score (average of all scores)
        format_score = sum(scores.values()) / len(scores) if scores else 0

        return {
            "format_score": round(format_score, 2),
            "detailed_scores": scores,
            "issues": issues,
            "word_count": word_count
        }

    def calculate_ats_score(
        self,
        resume: str,
        job_requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate overall ATS score for resume

        Args:
            resume: Resume text
            job_requirements: Job requirements with tech_stack and keywords

        Returns:
            Comprehensive ATS score report
        """
        # Extract keywords from job requirements
        ats_keywords = job_requirements.get("ats_keywords", [])
        tech_stack_all = []

        # Flatten tech stack
        tech_stack = job_requirements.get("tech_stack", {})
        for category, items in tech_stack.items():
            if isinstance(items, list):
                tech_stack_all.extend(items)

        # Combine all keywords
        all_keywords = list(set(ats_keywords + tech_stack_all))

        # Calculate keyword match
        keyword_match = self.calculate_keyword_match(resume, all_keywords)

        # Check format compliance
        format_compliance = self.check_format_compliance(resume)

        # Calculate overall score (weighted average)
        keyword_weight = 0.70  # 70% weight on keywords
        format_weight = 0.30   # 30% weight on format

        overall_score = (
            keyword_match["match_percentage"] * keyword_weight +
            format_compliance["format_score"] * format_weight
        )

        # Determine pass/fail
        passed = overall_score >= self.threshold

        # Generate feedback
        feedback = []
        if keyword_match["match_percentage"] < 60:
            feedback.append(f"Low keyword match ({keyword_match['match_percentage']:.1f}%). Add more relevant keywords.")
        if keyword_match["missing_keywords"]:
            top_missing = keyword_match["missing_keywords"][:5]
            feedback.append(f"Missing important keywords: {', '.join(top_missing)}")
        if format_compliance["issues"]:
            feedback.extend(format_compliance["issues"])

        if overall_score >= 90:
            feedback.insert(0, "Excellent ATS optimization!")
        elif overall_score >= self.threshold:
            feedback.insert(0, "Good ATS score, but there's room for improvement.")
        else:
            feedback.insert(0, "ATS score below threshold. Significant improvements needed.")

        return {
            "overall_score": round(overall_score, 2),
            "passed": passed,
            "threshold": self.threshold,
            "keyword_analysis": keyword_match,
            "format_analysis": format_compliance,
            "feedback": feedback,
            "recommendations": self._generate_recommendations(keyword_match, format_compliance)
        }

    def _generate_recommendations(
        self,
        keyword_match: Dict[str, Any],
        format_compliance: Dict[str, Any]
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        # Keyword recommendations
        if keyword_match["match_percentage"] < 70:
            recommendations.append("Incorporate more job-specific keywords naturally in your experience and projects")

        missing_count = len(keyword_match.get("missing_keywords", []))
        if missing_count > 5:
            recommendations.append(f"Add {min(missing_count, 10)} missing keywords where relevant")

        # Format recommendations
        if format_compliance["format_score"] < 80:
            for issue in format_compliance.get("issues", []):
                if "bullet points" in issue.lower():
                    recommendations.append("Use bullet points to list accomplishments")
                elif "sections" in issue.lower():
                    recommendations.append("Ensure all major resume sections are present")
                elif "too short" in issue.lower():
                    recommendations.append("Expand on your accomplishments and project details")
                elif "too long" in issue.lower():
                    recommendations.append("Condense your resume to be more concise")

        return recommendations


# Helper function
def score_resume_ats(
    resume: str,
    job_requirements: Dict[str, Any],
    threshold: float = 75.0
) -> Dict[str, Any]:
    """
    Convenience function to score a resume

    Args:
        resume: Resume text
        job_requirements: Job requirements dictionary
        threshold: Passing score threshold

    Returns:
        ATS score report
    """
    scorer = ATSScorer(threshold=threshold)
    return scorer.calculate_ats_score(resume, job_requirements)
