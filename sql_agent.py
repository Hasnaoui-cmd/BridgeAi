import os
from dotenv import load_dotenv
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import SQLDatabaseToolkit, create_sql_agent
from langchain_groq import ChatGroq
import warnings

warnings.filterwarnings("ignore")

# 1. Load Environment Variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
READONLY_DATABASE_URL = os.getenv("READONLY_DATABASE_URL")

db_url = READONLY_DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")

print("📊 Booting up SQL Agent (Structured Data Cruncher)...")

# 2. Connect to the Database
# We explicitly hide the "documents" and vector tables from the SQL agent!
db = SQLDatabase.from_uri(
    db_url,
    ignore_tables=["documents", "langchain_pg_collection", "langchain_pg_embedding"] 
)

# 3. Initialize the LLM
llm = ChatGroq(temperature=0, model_name="meta-llama/llama-4-scout-17b-16e-instruct", api_key=GROQ_API_KEY)

# 4. Create the SQL Toolkit
toolkit = SQLDatabaseToolkit(db=db, llm=llm)

# 5. Define the Agent's Persona and Rules
custom_prefix = """### ROLE ###
You are the Lead Data Scientist and Customs Compliance Officer for BridgeAI. Your expertise is in converting natural language into 100% accurate SQL queries for Moroccan and International Trade Databases.

### OPERATIONAL PIPELINE (MANDATORY STEPS) ###
1. SCHEMA DISCOVERY: Even if you think you know the table names, ALWAYS start by listing tables and then checking the schema for the specific columns. (Use sql_db_list_tables and sql_db_schema).
2. SQL STRATEGY: 
    - For product names: Use 'ILIKE %keyword%' to ensure you don't miss results due to case sensitivity or partial matches.
    - For HS Codes: Search for exact matches, but if not found, search for the first 4 or 6 digits (the 'Heading' or 'Subheading').
    - Joins: If a user asks about their own products and tariffs, JOIN 'client_products' with 'morocco_tariffs' or 'eu_nomenclature' using the common HS Code or ID columns.
3. QUALITY CONTROL: Before giving the final answer, verify that every numeric value (Tax rate, Duty, CBAM factor) came directly from a database row.

### DOMAIN-SPECIFIC KNOWLEDGE ###
- HS CODES: These are 4, 6, 8, or 10-digit numbers. Always treat them as strings to avoid leading zero errors.
- TARIFFS: If a user asks for 'Total Tax', sum the relevant columns (e.g., Import Duty + VAT + Para-fiscal tax) if they are separated.
- CBAM/REACH: When querying these tables, verify the chemical name or nomenclature code matches exactly.

### STRICT CONSTRAINTS (ZERO TOLERANCE FOR ERROR) ###
- NO HALLUCINATION: If the 'Observation' from a SQL tool is empty, your final answer MUST be: "I have consulted the structured trade database, and currently, there is no record for [Topic]. Check the legal documents for more conceptual information."
- NO GENERAL KNOWLEDGE: Do not answer based on what you 'think' a Moroccan tariff is. Only answer what the SQL 'Observation' provides.
- LIMITS: Always limit your search to the top 10 results to keep the response concise unless more are specifically requested.

### OUTPUT FORMAT ###
1. Start with a direct answer to the user's question.
2. Provide a small markdown table of the raw data you found if it's numeric or list-based.
3. State which database tables were consulted for this answer.
"""

# 6. Create the Execution Agent
sql_agent = create_sql_agent(
    llm=llm,
    toolkit=toolkit,
    verbose=True, # Set to True so you can watch it "think" and write SQL in your terminal!
    agent_type="zero-shot-react-description",
    prefix=custom_prefix
)

def run_sql_agent(question: str):
    """Takes a natural language question, writes SQL, runs it, and returns the answer."""
    try:
        response = sql_agent.invoke({"input": question})
        return response["output"]
    except Exception as e:
        return f"Error executing SQL search: {str(e)}"