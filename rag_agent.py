import os
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_postgres import PGVector  
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from sqlalchemy import create_engine
import warnings

warnings.filterwarnings("ignore")

# 1. Load variables explicitly in this module
load_dotenv()
READONLY_DATABASE_URL = os.getenv("READONLY_DATABASE_URL")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

_retriever = None
_retriever_p = None
_chain = None
_db = None

def _init_rag():
    global _retriever, _retriever_p, _chain, _db
    if _retriever is not None:
        return
        
    print("🧠 Booting up RAG Agent (Unstructured Document Search)...")
    
    # 2. Setup Vector Store
    embedding_model = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
    embedding_model_p = HuggingFaceEmbeddings(model_name="BAAI/bge-large-en-v1.5")
    
    connection_string = READONLY_DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")
    
    # NEW: Create a robust engine with pre-ping
    # This checks if the connection is alive before every query
    engine = create_engine(
        connection_string,
        pool_pre_ping=True,
        pool_recycle=300 # Restart connection every 5 minutes
    )
    
    _db = PGVector(
        embeddings=embedding_model,
        collection_name="documents", 
        connection=engine, # Pass the engine instead of the string
        use_jsonb=True,
    )
    _retriever = _db.as_retriever(search_kwargs={"k": 6}) 
    
    _db_p = PGVector(
        embeddings=embedding_model_p,
        collection_name="document_p", 
        connection=engine,
        use_jsonb=True,
    )
    _retriever_p = _db_p.as_retriever(search_kwargs={"k": 6}) 
    
    # 3. Setup LLM & Prompt
    llm = ChatGroq(temperature=0, model_name="meta-llama/llama-4-scout-17b-16e-instruct", api_key=GROQ_API_KEY)
    
    system_prompt = (
        "### ROLE ###\n"
        "You are a HIGHLY RESTRICTED Moroccan Customs Legal Assistant. "
        "Your knowledge is strictly limited to the 'LEGAL CONTEXT' provided below.\n\n"
        
        "### RULES ###\n"
        "1. You MUST formulate a correct, detailed, and helpful answer based on the provided 'LEGAL CONTEXT'.\n"
        "2. If the answer is completely missing from the 'LEGAL CONTEXT', you must state: "
        "'I am sorry, but I do not have information regarding that in my legal database.' "
        "However, if the context contains ANY relevant clues, use them to provide the best possible answer.\n"
        "3. DO NOT use your internal training data, general world knowledge, or the internet.\n"
        "4. DO NOT answer general questions (e.g., 'who are you', 'how are you', 'what is the capital of...').\n"
        "5. If the context refers to a specific law, article, or document, explicitly mention it in your answer to prove it comes from the legal text.\n\n"
        "6. Always respond in the SAME language as the user."
        "7. If the user speaks French, respond in French. If Arabic, respond in Arabic. If English, respond in English."
        "8. If the user does not specify a language, respond in the language of their last message."
        "use the context AND the Chat History to answer the question.\n\n"
        
        "### CHAT HISTORY ###\n"
        "{chat_history}\n\n"
        
        "### LEGAL CONTEXT ###\n"
        "{context}"
    )
    prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("human", "{input}")])
    _chain = prompt | llm | StrOutputParser()

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def get_db():
    _init_rag()
    return _db

def get_write_db():
    from langchain_postgres import PGVector
    from sqlalchemy import create_engine
    from langchain_huggingface import HuggingFaceEmbeddings
    import os
    
    admin_url = os.getenv("DATABASE_URL")
    connection_string = admin_url.replace("postgresql://", "postgresql+psycopg://")
    engine = create_engine(connection_string, pool_pre_ping=True)
    
    embedding_model = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
    return PGVector(
        embeddings=embedding_model,
        collection_name="documents", 
        connection=engine,
        use_jsonb=True,
    )

# 4. The Main Agent Function
def run_rag_agent(question: str, history_str: str):
    """Takes a question and chat history, searches vectors, and returns the AI answer."""
    _init_rag()
    
    # Use the raw question for pure semantic search instead of diluting it with generic context keywords
    docs1 = _retriever.invoke(question)
    
    # Safely query document_p collection just in case it doesn't exist yet
    try:
        docs2 = _retriever_p.invoke(question)
    except Exception as e:
        print(f"⚠️ Error querying document_p collection: {e}")
        docs2 = []
        
    docs = docs1 + docs2
    
    answer = _chain.invoke({
        "context": format_docs(docs),
        "chat_history": history_str,
        "input": question
    }, config={"run_name": "RAG_Legal_Expert"}
    )
    
    unique_sources = list(set([doc.metadata.get('source', 'Unknown') for doc in docs]))
    return answer, unique_sources