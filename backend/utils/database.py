import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, Dict, Any
from app.config import settings

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(
        settings.DATABASE_URL,
        cursor_factory=RealDictCursor
    )

def get_user_data(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetch user data including resume and demo files"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
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

    finally:
        cursor.close()
        conn.close()

def check_user_credits(user_id: str) -> int:
    """Check user credits"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT credits FROM users WHERE id = %s
        """, (user_id,))

        result = cursor.fetchone()
        return result['credits'] if result else 0

    finally:
        cursor.close()
        conn.close()

def decrement_user_credits(user_id: str) -> int:
    """Decrement user credits and return new balance"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE users
            SET credits = credits - 1
            WHERE id = %s AND credits > 0
            RETURNING credits
        """, (user_id,))

        conn.commit()
        result = cursor.fetchone()
        return result['credits'] if result else 0

    finally:
        cursor.close()
        conn.close()
