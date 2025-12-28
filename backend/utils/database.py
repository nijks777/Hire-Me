import psycopg2
from psycopg2.extras import RealDictCursor, Json
from typing import Optional, Dict, Any, List
from app.config import settings
import json

def get_db_connection():
    """Get database connection"""
    try:
        return psycopg2.connect(
            settings.DATABASE_URL,
            cursor_factory=RealDictCursor
        )
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def get_user_data(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetch user data including resume and demo files"""
    try:
        conn = get_db_connection()
        if not conn:
            return None

        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                id, email, name, credits,
                "resumeData", "resumeMimeType", "resumeFileName",
                "coverLetterData", "coverLetterMimeType", "coverLetterFileName",
                "coldEmailData", "coldEmailMimeType", "coldEmailFileName",
                "githubAccessToken", "githubUsername", "githubConnectedAt"
            FROM users
            WHERE id = %s
        """, (user_id,))

        user = cursor.fetchone()
        return dict(user) if user else None

    except Exception as e:
        print(f"Database error in get_user_data: {e}")
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def save_generation(
    user_id: str,
    job_description: str,
    company_name: str,
    cover_letter: str,
    cold_email: str,
    hr_name: Optional[str] = None,
    custom_prompt: Optional[str] = None,
    job_requirements: Optional[Dict] = None,
    company_research: Optional[Dict] = None,
    user_qualifications: Optional[Dict] = None,
    writing_style: Optional[Dict] = None
) -> Optional[str]:
    """Save a generation to the database and return the generation ID"""
    try:
        conn = get_db_connection()
        if not conn:
            return None

        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO generations (
                user_id, job_description, company_name, hr_name, custom_prompt,
                cover_letter, cold_email,
                job_requirements, company_research, user_qualifications, writing_style
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            user_id, job_description, company_name, hr_name, custom_prompt,
            cover_letter, cold_email,
            Json(job_requirements) if job_requirements else None,
            Json(company_research) if company_research else None,
            Json(user_qualifications) if user_qualifications else None,
            Json(writing_style) if writing_style else None
        ))

        generation_id = cursor.fetchone()['id']
        conn.commit()

        return str(generation_id)

    except Exception as e:
        print(f"Database error in save_generation: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def get_user_generations(user_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Fetch all generations for a user"""
    try:
        conn = get_db_connection()
        if not conn:
            return []

        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                id, job_description, company_name, hr_name, custom_prompt,
                cover_letter, cold_email, resume_suggestions, generation_type,
                job_requirements, company_research, user_qualifications, writing_style,
                created_at, updated_at
            FROM generations
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, (user_id, limit, offset))

        generations = cursor.fetchall()
        return [dict(gen) for gen in generations]

    except Exception as e:
        print(f"Database error in get_user_generations: {e}")
        return []
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def get_generation_by_id(generation_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a specific generation by ID (with user_id check for security)"""
    try:
        conn = get_db_connection()
        if not conn:
            return None

        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                id, job_description, company_name, hr_name, custom_prompt,
                cover_letter, cold_email, resume_suggestions, generation_type,
                job_requirements, company_research, user_qualifications, writing_style,
                created_at, updated_at
            FROM generations
            WHERE id = %s AND user_id = %s
        """, (generation_id, user_id))

        generation = cursor.fetchone()
        return dict(generation) if generation else None

    except Exception as e:
        print(f"Database error in get_generation_by_id: {e}")
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def delete_generation(generation_id: str, user_id: str) -> bool:
    """Delete a generation (with user_id check for security)"""
    try:
        conn = get_db_connection()
        if not conn:
            return False

        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM generations
            WHERE id = %s AND user_id = %s
        """, (generation_id, user_id))

        conn.commit()
        return cursor.rowcount > 0

    except Exception as e:
        print(f"Database error in delete_generation: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def deduct_credit(user_id: str, amount: int = 1) -> bool:
    """
    Deduct credits from user account
    Returns True if successful, False if insufficient credits or error
    Alias: deduct_user_credit
    """
    try:
        conn = get_db_connection()
        if not conn:
            return False

        cursor = conn.cursor()

        # Check current credits
        cursor.execute("""
            SELECT credits FROM users WHERE id = %s
        """, (user_id,))

        result = cursor.fetchone()
        if not result or result['credits'] < amount:
            print(f"Insufficient credits for user {user_id}")
            return False

        # Deduct credits
        cursor.execute("""
            UPDATE users
            SET credits = credits - %s
            WHERE id = %s AND credits >= %s
        """, (amount, user_id, amount))

        conn.commit()

        print(f"✅ Deducted {amount} credit(s) from user {user_id}. Remaining: {result['credits'] - amount}")
        return cursor.rowcount > 0

    except Exception as e:
        print(f"Database error in deduct_user_credit: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Alias for backward compatibility
deduct_user_credit = deduct_credit


def save_cover_letter_generation(
    user_id: str,
    job_description: str,
    company_name: str,
    cover_letter: str,
    job_analysis: Optional[Dict] = None,
    company_research: Optional[Dict] = None
) -> Optional[str]:
    """
    Save a cover letter generation to the database
    Returns the generation ID
    """
    try:
        conn = get_db_connection()
        if not conn:
            return None

        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO generations (
                user_id, job_description, company_name,
                cover_letter, cold_email, generation_type,
                job_requirements, company_research
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            user_id, job_description, company_name,
            cover_letter, "",  # Empty string for cold_email (NOT NULL constraint)
            "cover_letter",
            Json(job_analysis) if job_analysis else None,
            Json(company_research) if company_research else None
        ))

        generation_id = cursor.fetchone()['id']
        conn.commit()

        print(f"✅ Saved cover letter generation: {generation_id}")
        return str(generation_id)

    except Exception as e:
        print(f"Database error in save_cover_letter_generation: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def save_cold_email_generation(
    user_id: str,
    job_description: str,
    company_name: str,
    cold_email: str,
    job_analysis: Optional[Dict] = None,
    company_research: Optional[Dict] = None
) -> Optional[str]:
    """
    Save a cold email generation to the database
    Returns the generation ID
    """
    try:
        conn = get_db_connection()
        if not conn:
            return None

        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO generations (
                user_id, job_description, company_name,
                cover_letter, cold_email, generation_type,
                job_requirements, company_research
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            user_id, job_description, company_name,
            "",  # Empty string for cover_letter (NOT NULL constraint)
            cold_email,
            "cold_email",
            Json(job_analysis) if job_analysis else None,
            Json(company_research) if company_research else None
        ))

        generation_id = cursor.fetchone()['id']
        conn.commit()

        print(f"✅ Saved cold email generation: {generation_id}")
        return str(generation_id)

    except Exception as e:
        print(f"Database error in save_cold_email_generation: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def save_resume_suggestions(
    user_id: str,
    job_description: str,
    company_name: str,
    suggestions: Dict,
    jd_analysis: Optional[Dict] = None,
    ats_analysis: Optional[Dict] = None
) -> Optional[str]:
    """
    Save resume suggestions to the database
    Returns the generation ID
    """
    try:
        conn = get_db_connection()
        if not conn:
            return None

        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO generations (
                user_id, job_description, company_name,
                cover_letter, cold_email, resume_suggestions, generation_type,
                job_requirements, user_qualifications
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            user_id, job_description, company_name,
            "",  # Empty string for cover_letter (NOT NULL constraint)
            "",  # Empty string for cold_email (NOT NULL constraint)
            Json(suggestions),
            "resume_suggestions",
            Json(jd_analysis) if jd_analysis else None,
            Json(ats_analysis) if ats_analysis else None
        ))

        generation_id = cursor.fetchone()['id']
        conn.commit()

        print(f"✅ Saved resume suggestions: {generation_id}")
        return str(generation_id)

    except Exception as e:
        print(f"Database error in save_resume_suggestions: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def save_resume_customization(
    user_id: str,
    job_description: str,
    company_name: str,
    customized_resume: str,
    ats_score: Optional[float] = None,
    diff_report: Optional[Dict] = None,
    qa_results: Optional[Dict] = None,
    jd_analysis: Optional[Dict] = None,
    matched_projects: Optional[list] = None
) -> Optional[str]:
    """
    Save resume customization to the database
    Returns the generation ID
    """
    try:
        conn = get_db_connection()
        if not conn:
            return None

        cursor = conn.cursor()

        # Store customized resume and metadata
        resume_customization_data = {
            "customized_resume": customized_resume,
            "ats_score": ats_score,
            "diff_report": diff_report,
            "qa_results": qa_results,
            "matched_projects": matched_projects
        }

        cursor.execute("""
            INSERT INTO generations (
                user_id, job_description, company_name,
                cover_letter, cold_email, resume_suggestions, generation_type,
                job_requirements, user_qualifications
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            user_id, job_description, company_name,
            "",  # Empty string for cover_letter (NOT NULL constraint)
            "",  # Empty string for cold_email (NOT NULL constraint)
            Json(resume_customization_data),
            "resume_customization",
            Json(jd_analysis) if jd_analysis else None,
            None  # user_qualifications not used for customization
        ))

        generation_id = cursor.fetchone()['id']
        conn.commit()

        print(f"✅ Saved resume customization: {generation_id}")
        return str(generation_id)

    except Exception as e:
        print(f"Database error in save_resume_customization: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
