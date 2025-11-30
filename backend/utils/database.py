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
                "coldEmailData", "coldEmailMimeType", "coldEmailFileName"
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
                cover_letter, cold_email,
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
                cover_letter, cold_email,
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
