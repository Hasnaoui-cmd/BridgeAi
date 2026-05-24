import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
conn.autocommit = True
cur = conn.cursor()

try:
    cur.execute("ALTER TABLE prediction_history ADD COLUMN user_id UUID;")
    print("Successfully added user_id column to prediction_history table.")
except psycopg2.errors.DuplicateColumn:
    print("Column user_id already exists.")
except Exception as e:
    print("Error:", e)
finally:
    cur.close()
    conn.close()
