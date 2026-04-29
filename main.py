import os
import json
from typing import List
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_postgres import PGVector  # <-- 1. Swapped Chroma for PGVector
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from groq import Groq

# 1. Load Environment Variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL") # <-- 2. Grab the Supabase URL
groq_client = Groq(api_key=GROQ_API_KEY)

# 2. Initialize FastAPI App
app = FastAPI(title="AutoTrade-Comply API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Boot up the CLOUD Vector Database & LLM
print("🧠 Connecting to Supabase Cloud Brain...")
embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Fix the URL for the Langchain Postgres driver
connection_string = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")

# Connect to our new PostgreSQL table!
db = PGVector(
    embeddings=embedding_model,
    collection_name="moroccan_customs", 
    connection=connection_string,
    use_jsonb=True,
)
retriever = db.as_retriever(search_kwargs={"k": 6}) 

print("🗣️ Booting up Synthesizer...")
llm = ChatGroq(temperature=0, model_name="meta-llama/llama-4-scout-17b-16e-instruct", api_key=GROQ_API_KEY)

system_prompt = (
    "You are an expert Moroccan Customs and European Trade Compliance AI. "
    "Use the provided legal text AND the Chat History to answer the user's question. "
    "If the provided text does not contain the answer, say 'I do not have that legal information.' "
    "At the end of your answer, cite the specific document used.\n\n"
    "--- CHAT HISTORY ---\n{chat_history}\n\n"
    "--- LEGAL CONTEXT ---\n{context}"
)
prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("human", "{input}")])
chain = prompt | llm | StrOutputParser()

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

# 4. Define the API Request Models
class HistoryMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    question: str
    history: List[HistoryMessage] = []

# 5. Text Endpoint
@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        history_str = "\n".join([f"{msg.role}: {msg.content}" for msg in request.history])
        expanded_search_query = f"{request.question} (Context: Moroccan Customs Administration, ADII, trade procedures, and imports/exports)"
        
        # This search now happens instantly in the cloud!
        docs = retriever.invoke(expanded_search_query)
        context_str = format_docs(docs)
        
        answer = chain.invoke({
            "context": context_str,
            "chat_history": history_str,
            "input": request.question
        })
        
        unique_sources = list(set([doc.metadata.get('source', 'Unknown') for doc in docs]))
        return {"answer": answer, "sources": unique_sources}
    except Exception as e:
        return {"error": str(e)}

# 6. Audio Voice Endpoint
@app.post("/audio-chat")
async def audio_chat_endpoint(file: UploadFile = File(...), history: str = Form("[]")):
    try:
        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            buffer.write(await file.read())

        with open(temp_file_path, "rb") as audio_file:
            transcription = groq_client.audio.transcriptions.create(
                file=(temp_file_path, audio_file.read()),
                model="whisper-large-v3",
                response_format="json",
                language="fr"
            )
        os.remove(temp_file_path)
        user_question = transcription.text

        parsed_history = json.loads(history)
        history_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in parsed_history])

        expanded_search_query = f"{user_question} (Context: Moroccan Customs Administration, ADII, trade procedures, and imports/exports)"
        
        # This search now happens instantly in the cloud!
        docs = retriever.invoke(expanded_search_query)
        context_str = format_docs(docs)
        
        answer = chain.invoke({
            "context": context_str,
            "chat_history": history_str,
            "input": user_question
        })
        
        unique_sources = list(set([doc.metadata.get('source', 'Unknown') for doc in docs]))
        
        return {
            "transcription": user_question,
            "answer": answer,
            "sources": unique_sources
        }
    except Exception as e:
        return {"error": str(e)}

print("✅ Server ready with Cloud Memory! Waiting for requests...")