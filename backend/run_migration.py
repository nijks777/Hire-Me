#!/usr/bin/env python3
"""
Script to run database migrations
"""
import psycopg2
from app.config import settings
import os

def run_migration():
    """Run the generations table migration"""
    try:
        # Connect to database
        conn = psycopg2.connect(settings.DATABASE_URL)
        cursor = conn.cursor()

        # Read migration file
        migration_file = os.path.join(
            os.path.dirname(__file__),
            'migrations',
            'create_generations_table.sql'
        )

        with open(migration_file, 'r') as f:
            migration_sql = f.read()

        # Execute migration
        cursor.execute(migration_sql)
        conn.commit()

        print("✅ Migration completed successfully!")
        print("✅ Created 'generations' table")
        print("✅ Created indexes on user_id and created_at")
        print("✅ Created updated_at trigger")

        # Verify table was created
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'generations'
            ORDER BY ordinal_position
        """)

        columns = cursor.fetchall()
        print(f"\n📋 Table structure ({len(columns)} columns):")
        for col in columns:
            print(f"   - {col[0]}: {col[1]}")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        if conn:
            conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    run_migration()
