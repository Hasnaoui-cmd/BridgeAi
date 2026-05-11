# 🌉 theBridge — AutoTrade-Comply: Project Guide

> A full-stack AI Trade Compliance assistant powered by FastAPI (Python), React (Vite), Groq LLMs, and a Supabase PostgreSQL database.

---

## 📐 Architecture Overview

```
theBridge/
├── main.py               # FastAPI backend — entry point & API endpoints
├── orchestrator.py       # Master LLM Router (SQL vs. RAG decision)
├── sql_agent.py          # SQL Agent — answers structured data questions
├── rag_agent.py          # RAG Agent — answers document/law questions (pgvector)
├── test_sql.py           # Quick CLI tester for the SQL Agent
├── .env                  # 🔑 Secret keys (Groq API + Supabase DB URL)
    └── autotrade-frontend/   # React frontend (Vite)
        ├── src/              # React components, routing
        └── package.json      # Node.js dependencies (React, Vite, Supabase JS)
```

### How it works

```
User (Browser)
    │  HTTP (localhost:4200)
    ▼
React Frontend
    │  POST /chat  |  POST /audio-chat  |  GET /history/{session_id}
    ▼
FastAPI Backend (main.py — localhost:8000)
    │
    ▼
Orchestrator (orchestrator.py)
    ├─► [SQL question]  ──► SQL Agent  ──► Supabase PostgreSQL (structured tables)
    └─► [RAG question]  ──► RAG Agent  ──► pgvector store (documents collection)
```

---

## ✅ Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Python** | 3.10+ | Check: `python --version` |
| **pip** | latest | Check: `pip --version` |
| **Node.js** | 18+ | Check: `node --version` |
| **npm** | 11.x | Check: `npm --version` |
| **Git** | any | For branch management |

---

## 🔑 Environment Variables

The `.env` file at the project root is **already configured** with:

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Authenticates all LLM calls (Llama 3.1, Whisper) via [Groq Cloud](https://console.groq.com) |
| `DATABASE_URL` | Supabase PostgreSQL connection string (stores chat history + pgvector embeddings) |

> [!CAUTION]
> Never commit `.env` to Git. It is already listed in `.gitignore`. Keep your keys private.

---

## 🐍 Backend Setup & Run

### Step 1 — Create & activate a virtual environment

```powershell
# From the project root: c:\Users\pc\Desktop\theBridge
python -m venv venv
.\venv\Scripts\Activate.ps1
```

> [!TIP]
> If you get an execution policy error, run:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Step 2 — Install Python dependencies

```powershell
pip install fastapi uvicorn "psycopg[binary]" python-dotenv groq langchain langchain-groq langchain-community langchain-huggingface langchain-postgres sentence-transformers
```

> [!NOTE]
> The `BAAI/bge-m3` embedding model (~570 MB) will be downloaded automatically on **first run** by `rag_agent.py`. This only happens once; it is cached locally afterwards.

### Step 3 — Start the FastAPI backend

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Expected startup output:
```
📊 Booting up SQL Agent (Structured Data Cruncher)...
🧠 Booting up RAG Agent (Unstructured Document Search)...
👔 Booting up Orchestrator (The Master Router)...
✅ Server ready with Clean Architecture!
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

The interactive API docs are available at: **http://localhost:8000/docs**

---

## ⚛️ Frontend Setup & Run

Open a **second terminal** (keep the backend running in the first).

### Step 1 — Install Node.js dependencies

```powershell
cd autotrade-frontend
npm install
```

### Step 2 — Start the React dev server

```powershell
npm run dev
```

This runs `vite` and exposes the app at: **http://localhost:4200**

> [!NOTE]
> The backend CORS policy is pre-configured to allow `http://localhost:4200`, so no additional configuration is needed.

---

## 🚀 Full Startup (Quick Reference)

Open **two separate terminals** in `c:\Users\pc\Desktop\theBridge`:

**Terminal 1 — Backend:**
```powershell
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```powershell
cd autotrade-frontend
npm run dev
```

Then open your browser at **http://localhost:4200** ✅

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/docs` | Swagger UI (interactive API docs) |
| `POST` | `/chat` | Send a text question to the AI |
| `POST` | `/audio-chat` | Send an audio file for transcription + AI answer |
| `GET` | `/history/{session_id}` | Retrieve last 6 messages for a session |

### Example `/chat` request body:
```json
{
  "question": "What is the import duty for HS code 8501?",
  "session_id": "user-session-001"
}
```

### Example `/chat` response:
```json
{
  "answer": "The import duty for HS code 8501 is ...",
  "sources": ["Structured Database (Enterprise SQL Tables)"],
  "agent": "SQL Agent"
}
```

---

## 🧪 Testing the SQL Agent (CLI)

To quickly verify the SQL Agent works without starting the full server:

```powershell
.\venv\Scripts\Activate.ps1
python test_sql.py
```

You can edit the `question` variable in `test_sql.py` to test different queries.

---

## 🤖 Agent Routing Logic

The **Orchestrator** (`orchestrator.py`) uses `llama-3.1-8b-instant` to classify every question:

| Question Type | Routed To | Backend Store |
|---|---|---|
| Tax rates, tariffs, HS Codes, CBAM benchmarks, client products | **SQL Agent** | PostgreSQL structured tables |
| Laws, customs procedures, registration rules, document explanations | **RAG Agent** | pgvector (`documents` collection) |

---

## 🗄️ Database (Supabase)

The project uses **Supabase** (hosted PostgreSQL) — no local DB setup needed.

Key tables used:

| Table | Used By | Purpose |
|---|---|---|
| `chat_history` | `main.py` | Stores all session messages |
| `documents` | `rag_agent.py` | pgvector collection for RAG embeddings |
| `langchain_pg_collection` | `rag_agent.py` | LangChain vector metadata |
| `eu_nomenclature`, `morocco_tariffs`, `reach_svhc_list`, `client_products`, etc. | `sql_agent.py` | Structured trade compliance data |

> [!NOTE]
> The SQL Agent **automatically ignores** the vector/RAG tables (`documents`, `langchain_pg_collection`, `langchain_pg_embedding`) and only queries the structured trade data tables.

---

## 🐛 Common Issues & Fixes

| Problem | Cause | Fix |
|---|---|---|
| `ModuleNotFoundError` | Missing Python package | Re-run `pip install ...` from Step 2 |
| `psycopg.OperationalError` | DB connection failed | Check `DATABASE_URL` in `.env` |
| `AuthenticationError` (Groq) | Invalid API key | Check `GROQ_API_KEY` in `.env` |
| Frontend can't reach backend | CORS or wrong port | Make sure backend is on port `8000` and frontend on `4200` |
| `ENOENT` / `vite: not found` | Node deps missing | Run `npm install` inside `autotrade-frontend/` |
| Slow first boot | `BAAI/bge-m3` model downloading | Wait for the one-time download to complete |
| PowerShell execution policy error | Windows default restriction | Run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |

---

## 🌿 Git Branches

```powershell
# See all branches
git branch -a

# You are currently on:
git checkout feature-zaid

# Switch back to main
git checkout main
```

---

## 📦 Technology Stack Summary

| Layer | Technology |
|---|---|
| **Frontend** | React, Vite, TypeScript, Supabase JS SDK |
| **Backend** | FastAPI, Uvicorn, Python 3.10+ |
| **LLM Provider** | Groq Cloud (Llama 3.1 8B Instant, Whisper Large v3) |
| **LLM Framework** | LangChain (Core, Groq, Community, HuggingFace, Postgres) |
| **Embeddings** | `BAAI/bge-m3` via HuggingFace |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **ORM / DB Driver** | psycopg3 |
