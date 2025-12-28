"""
Helper script to get a test user ID from the database
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from utils.database import get_db_connection


def get_test_user():
    print("\n" + "="*60)
    print("🔍 FETCHING TEST USER FROM DATABASE")
    print("="*60 + "\n")

    try:
        conn = get_db_connection()
        if not conn:
            print("❌ Failed to connect to database")
            return None

        cursor = conn.cursor()

        # Get first user with resume data
        cursor.execute("""
            SELECT id, email, name, credits,
                   "resumeData" IS NOT NULL as has_resume,
                   "githubUsername",
                   "githubAccessToken" IS NOT NULL as has_github
            FROM users
            WHERE "resumeData" IS NOT NULL
            LIMIT 5
        """)

        users = cursor.fetchall()

        if not users:
            print("❌ No users found with resume data")
            print("💡 Please upload a resume for at least one user")
            return None

        print(f"✅ Found {len(users)} user(s) with resume data:\n")

        for i, user in enumerate(users, 1):
            print(f"{i}. User ID: {user['id']}")
            print(f"   Email: {user['email']}")
            print(f"   Name: {user['name']}")
            print(f"   Credits: {user['credits']}")
            print(f"   Has Resume: {'✅' if user['has_resume'] else '❌'}")
            print(f"   GitHub Connected: {'✅' if user['has_github'] else '❌'}")
            if user['has_github']:
                print(f"   GitHub Username: {user['githubUsername']}")
            print()

        # Return first user's ID
        test_user_id = users[0]['id']

        print("="*60)
        print(f"📋 COPY THIS USER ID FOR TESTING:")
        print(f"   {test_user_id}")
        print("="*60 + "\n")

        print("💡 To use in tests, replace 'test_user_123' with:")
        print(f'   test_user_id = "{test_user_id}"')
        print()

        return test_user_id

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    user_id = get_test_user()
    sys.exit(0 if user_id else 1)
