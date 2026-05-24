import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
cur = conn.cursor()

cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'companies'")
print("companies:", cur.fetchall())

cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_profiles'")
print("user_profiles:", cur.fetchall())
