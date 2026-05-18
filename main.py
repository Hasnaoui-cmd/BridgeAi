import os
import json
import psycopg
from psycopg.rows import dict_row
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
from fastapi.responses import StreamingResponse
from orchestrator import stream_orchestrator
from supabase import create_client
from supabase_client import supabase_admin
import shutil
from ingestion import process_pdf_to_vectors
from vision_agent import extract_invoice_data
import warnings

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
# 1. Load Environment Variables
# ─────────────────────────────────────────────
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
groq_client = Groq(api_key=GROQ_API_KEY)

# ─────────────────────────────────────────────
# 2. FastAPI App
# ─────────────────────────────────────────────
app = FastAPI(title="AutoTrade-Comply API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# 3. Database Helper Functions (Memory)
# ─────────────────────────────────────────────

#function to get the real role of the person sending the message (admin or user)
def get_user_role_from_id(user_id: str):
    """Checks the user_profiles table to get the actual role."""
    try:
        res = supabase_admin.from_("user_profiles").select("role").eq("id", user_id).single().execute()
        if res.data:
            return res.data['role']
        return "user" # Default
    except:
        return "user"

def save_message(session_id: str, role: str, content: str):
    """Saves a single message to Supabase chat_history table. Returns True on success, False on failure."""
    try:
        # Check if we have data to save
        if not content or not session_id:
            print(f"⚠️ Skipping save: content or session_id is empty")
            return False
        with psycopg.connect(DATABASE_URL) as conn:
            # Ensure the column names match your table: session_id, role, conten
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO chat_history (session_id, role, content) VALUES (%s, %s, %s)",
                    (session_id, role, str(content))
                )
                conn.commit()
        print(f"💾 Message saved to DB: {role} for session {session_id[:8]}...")
        return True
    except Exception as e:
        print(f"❌ DB SAVE ERROR for session {session_id}, role={role}: {e}")
        return False


def get_session_history(session_id: str):
    """Retrieves ALL messages for a specific session, ordered chronologically."""
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT role, content FROM chat_history WHERE session_id = %s ORDER BY created_at ASC",
                (session_id,)
            )
            return cur.fetchall()


# ─────────────────────────────────────────────
# 4. API Request Models
# ─────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str
    session_id: str

# ─────────────────────────────────────────────
# 5. History Endpoint
# ─────────────────────────────────────────────
@app.get("/history/{session_id}")
async def get_history_endpoint(session_id: str):
    """Returns the last 6 messages for a given session."""
    try:
        messages = get_session_history(session_id)
        return {"messages": messages}
    except Exception as e:
        print(f"❌ History retrieval error: {e}")
        return {"error": str(e)}

# ─────────────────────────────────────────────
# 6. THE TEXT CHAT ENDPOINT (Streaming + Memory)
# ─────────────────────────────────────────────
@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Streams AI tokens to the frontend in real-time via SSE.
    Uses a wrapper generator to:
      1. Forward each chunk to the client instantly
      2. Accumulate token text into a full answer
      3. Save the complete answer to Supabase AFTER the stream finishes
    """
    try:
        # 1. Get the actual role (Admin or User)
        user_id = request.session_id.split("____")[0]
        actual_role = get_user_role_from_id(user_id)

        # 2. Save user message to Supabase
        save_message(request.session_id, actual_role, request.question)

        # 3. Get FULL chat history from Supabase (for UI display on load)
        past_messages = get_session_history(request.session_id)

        # 4. KEEP LLM FAST & SAFE: Only feed the last 10 messages to the AI
        recent_context = past_messages[-10:] if len(past_messages) > 10 else past_messages

        # 5. THE MEMORY CATCHER WRAPPER
        async def stream_and_save():
            """Wraps the orchestrator stream: forwards chunks AND saves the final answer."""
            full_ai_answer = ""

            try:
                # 🔍 DEBUG PING: Confirm the SSE connection is alive
                print("📡 [PING] Sending connection ping to frontend...")
                yield f"data: {json.dumps({'type': 'status', 'content': 'Analyse de la requête en cours...'})}\n\n"

                # Watch the stream as it goes to the user
                # Pass sliced context — orchestrator converts to LangChain messages
                async for chunk in stream_orchestrator(request.question, recent_context):
                    print(f"📡 [STREAM] Forwarding chunk: {chunk[:80]}...")  # DEBUG

                    # Intercept token data to accumulate the full answer
                    for line in chunk.split('\n'):
                        if line.startswith("data: "):
                            try:
                                data_json = json.loads(line[6:].strip())
                                if data_json.get("type") == "token":
                                    full_ai_answer += data_json.get("content", "")
                            except json.JSONDecodeError:
                                pass  # Ignore malformed intermediate chunks

                    # Pass the chunk to the frontend INSTANTLY
                    yield chunk

            except Exception as stream_err:
                # If the stream itself errors, yield an error event to the frontend
                print(f"❌ Stream error: {stream_err}")
                yield f"data: {json.dumps({'type': 'token', 'content': f'Error during generation: {str(stream_err)}'})}\n\n"

            finally:
                # 4. Stream is finished! Save the complete answer to Supabase
                if full_ai_answer.strip():
                    success = save_message(request.session_id, "ai", full_ai_answer)
                    if success:
                        print(f"✅ AI answer saved to Supabase for session: {request.session_id} ({len(full_ai_answer)} chars)")
                    else:
                        print(f"⚠️ Failed to save AI answer for session: {request.session_id}")

        # 6. Return the streaming response with anti-buffering headers
        return StreamingResponse(
            stream_and_save(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",        # Prevent browser caching
                "Connection": "keep-alive",          # Keep the connection open
                "X-Accel-Buffering": "no"            # Disable Nginx/reverse-proxy buffering
            }
        )

    except Exception as e:
        print(f"❌ Chat endpoint error: {e}")
        return {"error": str(e)}

# ─────────────────────────────────────────────
# 7. AUDIO CHAT ENDPOINTS (Transcribe & Stream)
# ─────────────────────────────────────────────
@app.post("/audio-chat/transcribe")
async def audio_chat_transcribe_endpoint(file: UploadFile = File(...)):
    """
    Accepts an audio file and transcribes it with Whisper.
    Returns ONLY the transcription text.
    """
    try:
        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            buffer.write(await file.read())

        with open(temp_file_path, "rb") as audio_file:
            transcription = groq_client.audio.transcriptions.create(
                file=(temp_file_path, audio_file.read()),
                model="whisper-large-v3",
                response_format="json",
                language="fr"  # French language support
            )
        os.remove(temp_file_path)
        
        return {"transcription": transcription.text}
    except Exception as e:
        print(f"❌ Transcribe Error: {e}")
        return {"error": str(e)}

@app.post("/audio-chat/stream")
async def audio_chat_stream_endpoint(file: UploadFile = File(...), session_id: str = Form(...)):
    """
    Accepts an audio file, transcribes it with Whisper,
    then streams the AI answer via SSE (same pattern as /chat).
    Sends a 'transcription' event first so the frontend can display what the user said.
    """
    try:
        # 1. Save and Transcribe the Audio (Whisper)
        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            buffer.write(await file.read())

        with open(temp_file_path, "rb") as audio_file:
            transcription = groq_client.audio.transcriptions.create(
                file=(temp_file_path, audio_file.read()),
                model="whisper-large-v3",
                response_format="json",
                language="fr"  # French language support
            )
        os.remove(temp_file_path)
        user_question = transcription.text
        print(f"🎙️ Voice transcription received: {user_question}")
        # 2. GET ACTUAL ROLE
        user_id = session_id.split("___")[0]
        actual_role = get_user_role_from_id(user_id)

        # 3. Save user audio message to Supabase
        save_message(session_id, actual_role, f"🎤 {user_question}")

        # 4. Get FULL chat history from Supabase
        past_messages = get_session_history(session_id)

        # 4. KEEP LLM FAST & SAFE: Only feed the last 10 messages to the AI
        recent_context = past_messages[-10:] if len(past_messages) > 10 else past_messages

        # 5. THE MEMORY CATCHER WRAPPER
        async def stream_with_transcription_and_save():
            """Yields transcription first, then streams AI tokens, then saves to DB."""
            # Send the transcription event so the frontend knows what was said
            yield f"data: {json.dumps({'type': 'transcription', 'content': user_question})}\n\n"

            full_ai_answer = ""

            try:
                # 🔍 DEBUG PING: Confirm the SSE connection is alive
                print("📡 [AUDIO PING] Sending connection ping to frontend...")
                yield f"data: {json.dumps({'type': 'status', 'content': 'Analyse de la requête en cours...'})}\n\n"

                # Watch the stream as it goes to the user
                # Pass sliced context — orchestrator converts to LangChain messages
                async for chunk in stream_orchestrator(user_question, recent_context):
                    print(f"📡 [AUDIO STREAM] Forwarding chunk: {chunk[:80]}...")  # DEBUG
                    # Intercept token data to accumulate the full answer
                    for line in chunk.split('\n'):
                        if line.startswith("data: "):
                            try:
                                data_json = json.loads(line[6:].strip())
                                if data_json.get("type") == "token":
                                    full_ai_answer += data_json.get("content", "")
                            except json.JSONDecodeError:
                                pass

                    # Forward the chunk to the frontend instantly
                    yield chunk

            except Exception as stream_err:
                print(f"❌ Audio stream error: {stream_err}")
                yield f"data: {json.dumps({'type': 'token', 'content': f'Error during generation: {str(stream_err)}'})}\n\n"

            finally:
                # Stream finished — save the complete answer to Supabase
                if full_ai_answer.strip():
                    success = save_message(session_id, "ai", full_ai_answer)
                    if success:
                        print(f"✅ AI answer saved to Supabase for audio session: {session_id} ({len(full_ai_answer)} chars)")
                    else:
                        print(f"⚠️ Failed to save AI answer for audio session: {session_id}")

        # 5. Return the streaming response with anti-buffering headers
        return StreamingResponse(
            stream_with_transcription_and_save(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    except Exception as e:
        print(f"❌ Audio endpoint error: {e}")
        # Return the error as a stream so the frontend SSE handler can catch it
        async def stream_error():
            yield f"data: {json.dumps({'type': 'token', 'content': f'Error: {str(e)}'})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'sources': [], 'agents': 'Error'})}\n\n"
        return StreamingResponse(stream_error(), media_type="text/event-stream")

@app.get("/sessions/{user_id}")
async def get_user_sessions(user_id: str):
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                # Grab the earliest non-AI message per session (used as title)
                cur.execute("""
                    SELECT DISTINCT ON (session_id)
                        session_id,
                        content,
                        created_at
                    FROM chat_history
                    WHERE session_id LIKE %s AND role != 'ai'
                    ORDER BY session_id, created_at ASC
                """, (f"{user_id}___%",))
                title_rows = cur.fetchall()

                # Grab the latest activity time per session (for ordering)
                cur.execute("""
                    SELECT session_id, MAX(created_at) as last_activity
                    FROM chat_history
                    WHERE session_id LIKE %s
                    GROUP BY session_id
                    ORDER BY last_activity DESC
                """, (f"{user_id}___%",))
                activity_map = {r['session_id']: r['last_activity'] for r in cur.fetchall()}

        # Sort by recency (most recent first)
        sorted_rows = sorted(
            title_rows,
            key=lambda r: activity_map.get(r['session_id'], r['created_at']),
            reverse=True
        )

        sessions = []
        for row in sorted_rows:
            title = row['content'] or 'Conversation'
            # Strip voice prefix
            if title.startswith('🎤 '):
                title = title[2:].strip()
            # Truncate to 55 chars
            if len(title) > 55:
                title = title[:55] + '…'
            sessions.append({
                "id": row['session_id'],
                "title": title,
                "last_activity": str(activity_map.get(row['session_id'], row['created_at']))
            })

        return {"sessions": sessions}
    except Exception as e:
        print(f"❌ Sessions error: {e}")
        return {"sessions": []}



# Initialize Supabase Admin Client (using Service Role Key to bypass RLS)
#supabase_admin = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

@app.post("/admin/upload-pdf")
async def admin_upload_pdf(
    file: UploadFile = File(...), 
    user_id: str = Form(...), # Pass this from the frontend
    document_type: str = Form("regulation")
):
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # 1. Upload to Supabase Storage (The physical file)
        storage_path = f"knowledge_base/{file.filename}"
        with open(temp_path, "rb") as f:
            supabase_admin.storage.from_("legal-documents").upload(storage_path, f)
        
        # Get the public URL for the record
        storage_url = supabase_admin.storage.from_("legal-documents").get_public_url(storage_path)

        # 2. Vectorize for the RAG Agent (The AI knowledge)
        num_chunks = process_pdf_to_vectors(temp_path, file.filename)

        # 3. Register in compliance_documents (The Management record)
        # This allows the Admin to see the file in their list!
        doc_record = {
            "user_id": user_id,
            "document_name": file.filename,
            "document_type": document_type,
            "storage_url": storage_url,
        }
        print(f"📝 Attempting to register {file.filename} for user {user_id}...")
        res = supabase_admin.from_("compliance_documents").insert(doc_record).execute()
        print(f"✅ Registry response: {res}")

        return {
            "status": "success", 
            "message": f"Ingested {file.filename}. {num_chunks} chunks added to AI memory."
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.delete("/admin/delete-document/{doc_id}")
async def delete_document(doc_id: str, filename: str):
    """
    Performs a 3-way deletion: Storage, Database Registry, and Vector Knowledge.
    """
    try:
        # 1. Delete from Supabase Storage
        supabase_admin.storage.from_("legal-documents").remove([f"knowledge_base/{filename}"])

        # 2. Delete from compliance_documents (Registry)
        supabase_admin.from_("compliance_documents").delete().eq("id", doc_id).execute()

        # 3. Delete from langchain_pg_embedding (AI Vectors)
        # We use a direct SQL command to find all chunks where metadata source matches filename
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM langchain_pg_embedding WHERE cmetadata->>'source' = %s",
                    (filename,)
                )
        
        return {"status": "success", "message": f"Successfully removed {filename} from all systems."}
    except Exception as e:
        print(f"❌ Delete Error: {e}")
        return {"status": "error", "message": str(e)}

class UpdateRoleRequest(BaseModel):
    role: str
    admin_id: str

@app.patch("/admin/users/{target_user_id}/role")
async def update_user_role(target_user_id: str, request: UpdateRoleRequest):
    try:
        # Security check
        if get_user_role_from_id(request.admin_id) != "admin":
            return {"status": "error", "message": "Unauthorized: Admin access required."}
            
        res = supabase_admin.from_("user_profiles").update({"role": request.role}).eq("id", target_user_id).execute()
        return {"status": "success", "message": f"User role updated to {request.role}"}
    except Exception as e:
        print(f"❌ Role Update Error: {e}")
        return {"status": "error", "message": str(e)}

@app.delete("/admin/users/{target_user_id}")
async def delete_user(target_user_id: str, admin_id: str = None): # admin_id is optional for safety
    try:
        print(f"📡 Request to delete user: {target_user_id} by admin: {admin_id}")

        # 1. Security check (Only if admin_id is provided)
        if admin_id:
            role = get_user_role_from_id(admin_id)
            if role != "admin":
                return {"status": "error", "message": "Unauthorized: Admin access required."}

        # 2. Delete from user_profiles table FIRST
        # This clears your local data so the UI updates immediately
        try:
            supabase_admin.from_("user_profiles").delete().eq("id", target_user_id).execute()
            print("✅ Removed from user_profiles table")
        except Exception as e:
            print(f"⚠️ Table delete warning: {e}")

        # 3. Delete from Supabase Auth (The login account)
        # We wrap this in another try/except so if the user is already gone from Auth,
        # we still return "Success" to the frontend.
        try:
            supabase_admin.auth.admin.delete_user(target_user_id)
            print("✅ Removed from Supabase Auth")
        except Exception as auth_err:
            # "User not found" usually happens here. We ignore it and stay successful.
            print(f"ℹ️ Auth delete info (User might already be gone): {auth_err}")

        return {"status": "success", "message": "User account and profile cleared."}

    except Exception as e:
        print(f"❌ Critical Delete Error: {e}")
        return {"status": "error", "message": str(e)}



@app.post("/chat/vision")
async def chat_with_vision(
    file: UploadFile = File(...),
    question: str = Form(...),
    session_id: str = Form(...)
):
    try:
        image_bytes = await file.read()
        invoice_json = extract_invoice_data(image_bytes)
        
        context_prompt = f"""
        [DOCUMENT CONTEXT]
        Data extracted from invoice: {json.dumps(invoice_json)}
        [USER QUESTION]
        {question}
        """
        # 1. Get the actual role (Admin or User)
        user_id = session_id.split("___")[0]
        actual_role = get_user_role_from_id(user_id)

        # 2. SAVE USER MESSAGE IMMEDIATELY
        save_message(session_id, actual_role, f"📸 [Invoice Attached] {question}")

        past_messages = get_session_history(session_id)
        recent_context = past_messages[-10:] if len(past_messages) > 10 else past_messages

        async def stream_and_persist():
            full_ai_answer = ""
            
            # The orchestrator handles the tools (SQL/RAG) and gives us the tokens
            async for chunk in stream_orchestrator(context_prompt, recent_context):
                # We need to extract the raw text from the SSE 'token' chunks
                if "data: " in chunk:
                    for line in chunk.split('\n'):
                        if line.startswith("data: "):
                            try:
                                data = json.loads(line[6:])
                                if data.get("type") == "token":
                                    full_ai_answer += data.get("content", "")
                            except:
                                pass
                yield chunk

            # 3. SAVE AI MESSAGE AFTER STREAM COMPLETES
            if full_ai_answer.strip():
                # Save to History
                save_message(session_id, "ai", full_ai_answer)
                
                # Save to Risk Dashboard (Capture High/Low Risk)
                user_id = session_id.split("___")[0]
                risk_keywords = ["warning", "risk", "mismatch", "error", "caution", "alert", "danger"]
                status = "High Risk" if any(w in full_ai_answer.lower() for w in risk_keywords) else "Low Risk"
                
                try:
                    supabase_admin.from_("compliance_screenings").insert({
                        "user_id": user_id,
                        "session_id": session_id,
                        "screening_type": "Invoice Multi-modal Audit",
                        "status": status,
                        "ai_analysis_notes": full_ai_answer[:1000]
                    }).execute()
                except Exception as e:
                    print(f"⚠️ Risk Log Error: {e}")

        return StreamingResponse(stream_and_persist(), media_type="text/event-stream")

    except Exception as e:
        print(f"❌ Vision Endpoint Error: {e}")
        return {"error": str(e)}