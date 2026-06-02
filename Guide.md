# 🌉 BridgeAI — Quick Start Guide

> **Enterprise AI Trade Compliance & Delay Prediction Platform**
>
> FastAPI · React/Vite · LangGraph · Groq LLMs · Supabase PostgreSQL · OpenWeather

---

## 📐 Architecture

```
BridgeAI/
├── main.py                        # FastAPI entry point & API endpoints
├── orchestrator.py                # LangGraph Master Router (Q&A: SQL vs. RAG)
├── sql_agent.py                   # SQL Agent — structured trade data queries
├── rag_agent.py                   # RAG Agent — legal document search (pgvector)
├── vision_agent.py                # Invoice Vision Agent — image → compliance data
├── ingestion.py                   # PDF ingestion pipeline (LlamaParse → pgvector)
├── supabase_client.py             # Supabase admin client
├── .env                           # 🔑 API keys & connection strings
│
├── agents/
│   └── prediction_agent.py        # LangGraph Prediction State Machine (5 nodes)
│
├── services/
│   └── routing_engine.py          # Multimodal Route Optimizer Graph Engine
│
├── utils/
│   └── environment_api.py         # Live weather & port congestion APIs
│
├── routers/
│   ├── prediction.py              # POST /api/predict/chat endpoint
│   ├── routing.py                 # POST /api/route/optimize endpoint
│   └── auth.py                    # Authentication stub
│
├── ml_models/
│   ├── bridge_import_hybrid.pkl   # Import delay prediction model
│   └── bridge_export_hybrid.pkl   # Export delay prediction model
│
└── autotrade-frontend/            # React + Vite + TypeScript frontend
    ├── src/
    ├── package.json
    └── vite.config.ts
```

### Request Flow

```
┌─────────────┐     HTTP :4200     ┌─────────────────────┐     REST :8000     ┌──────────────────────────┐
│  React/Vite │ ─────────────────► │  FastAPI Backend     │ ─────────────────► │  LangGraph Orchestrator  │
│  Frontend   │ ◄───────────────── │  (main.py)           │ ◄───────────────── │  (orchestrator.py)       │
└─────────────┘                    └──────────┬───────────┘                    └────────┬─────────────────┘
                                              │                                         │
                                    POST /api/predict/chat                    ┌─────────┴─────────┐
                                              │                               │                   │
                                              ▼                          SQL Agent           RAG Agent
                                ┌─────────────────────────┐             (hs_nomenclature)   (documents +
                                │  Prediction Agent        │                                 document_p)
                                │  (LangGraph State Graph) │
                                ├──────────────────────────┤
                                │ 1. extraction_node       │
                                │ 2. sql_node              │──► hs_nomenclature table only
                                │ 3. rag_node              │──► documents + document_p (pgvector)
                                │ 4. environment_node      │──► OpenWeather API + Mock Port API
                                │ 5. ml_prediction_node    │──► .pkl model + SHAP explainer
                                └──────────────────────────┘
```

---

## ✅ Prerequisites

| Requirement | Version  | Check Command         |
|-------------|----------|-----------------------|
| **Python**  | 3.10+    | `python --version`    |
| **pip**     | latest   | `pip --version`       |
| **Node.js** | 18+      | `node --version`      |
| **npm**     | 9+       | `npm --version`       |
| **Git**     | any      | `git --version`       |

---

## 🔑 Environment Variables (`.env`)

Create a `.env` file in the project root with the following keys. **All are required** for full functionality:

```env
# ── LLM Provider ──
GROQ_API_KEY=your_groq_api_key_here

# ── Supabase Database (read/write — chat history, admin operations) ──
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-region.pooler.supabase.com:6543/postgres

# ── Supabase Project ──
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...your_service_role_jwt...

# ── Read-only DB connection (SQL Agent — prevents accidental writes) ──
READONLY_DATABASE_URL=postgresql://bridge_sql_agent.xxxxx:password@aws-region.pooler.supabase.com:6543/postgres

# ── PDF Ingestion (LlamaParse) ──
LLAMA_CLOUD_API_KEY=llx-your_llama_cloud_key_here

# ── Live Weather Data (OpenWeather API) ──
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

**Where to get your keys:**

| Key                        | Source                                                      |
|----------------------------|-------------------------------------------------------------|
| `GROQ_API_KEY`             | [Groq Cloud Console](https://console.groq.com)             |
| `DATABASE_URL`             | Supabase → Project Settings → Database → Connection String  |
| `SUPABASE_URL`             | Supabase → Project Settings → API → Project URL             |
| `SUPABASE_SERVICE_ROLE_KEY`| Supabase → Project Settings → API → Service Role Key        |
| `READONLY_DATABASE_URL`    | Supabase → Custom Postgres role (read-only)                 |
| `LLAMA_CLOUD_API_KEY`      | [LlamaCloud Dashboard](https://cloud.llamaindex.ai)        |
| `OPENWEATHER_API_KEY`      | [OpenWeather](https://openweathermap.org/api) (free tier)   |

> [!CAUTION]
> Never commit `.env` to version control. It is already listed in `.gitignore`.

---

## 🐍 Backend Setup

### Step 1 — Create & activate a virtual environment

```powershell
# From the project root
python -m venv venv
.\venv\Scripts\Activate.ps1
```

> [!TIP]
> If you see an execution policy error, run:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Step 2 — Install Python dependencies

```powershell
pip install -r requirements.txt
```

> [!NOTE]
> The `BAAI/bge-m3` embedding model (~570 MB) downloads automatically on first run.
> This only happens once — it is cached locally afterwards.

### Step 3 — Start the FastAPI backend

```powershell
uvicorn main:app --reload
```

The server starts at **http://localhost:8000**. Interactive API docs at **http://localhost:8000/docs**.

Expected startup output:

```
📊 Booting up SQL Agent (Structured Data Cruncher)...
🧠 Booting up RAG Agent (Unstructured Document Search)...
🕸️ Booting up LangGraph Orchestrator (Streaming Mode)...
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

---

## ⚛️ Frontend Setup

Open a **second terminal** (keep the backend running in the first).

### Step 1 — Install Node.js dependencies

```powershell
cd autotrade-frontend
npm install
```

> [!NOTE]
> We recently integrated a premium landing page containing several Shadcn UI components and Framer Motion animations. Running `npm install` is required to fetch these new packages (`@radix-ui/react-*`, `framer-motion`, etc.).

### Step 2 — Start the React dev server

```powershell
npm run dev
```

The frontend is available at **http://localhost:4200**.

> [!NOTE]
> CORS is pre-configured on the backend to accept requests from `http://localhost:4200`.

---

## 🚀 Quick Reference (Two Terminals)

**Terminal 1 — Backend:**

```powershell
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

**Terminal 2 — Frontend:**

```powershell
cd autotrade-frontend
npm install
npm run dev
```

Open **http://localhost:4200** in your browser. ✅

---

## 🔌 API Endpoints

### General Chat (Q&A)

| Method | Endpoint                       | Description                                       |
|--------|--------------------------------|---------------------------------------------------|
| `GET`  | `/`                            | Health check                                      |
| `GET`  | `/docs`                        | Swagger UI (interactive API docs)                 |
| `POST` | `/chat`                        | SSE streaming chat (Orchestrator → SQL/RAG)       |
| `GET`  | `/history/{session_id}`        | Retrieve chat history for a session               |

### Prediction & Routing

| Method | Endpoint                       | Description                                       |
|--------|--------------------------------|---------------------------------------------------|
| `POST` | `/api/predict/chat`            | Conversational delay prediction (LangGraph)       |
| `GET`  | `/api/route/nodes`             | Fetch unique supply chain nodes                   |
| `POST` | `/api/route/optimize`          | Calculate shortest multimodal path via NetworkX   |

### Audio & Vision

| Method | Endpoint                       | Description                                       |
|--------|--------------------------------|---------------------------------------------------|
| `POST` | `/audio-chat/transcribe`       | Whisper audio transcription                       |
| `POST` | `/audio-chat/stream`           | Audio → transcription → AI answer stream          |
| `POST` | `/chat/vision`                 | Invoice image analysis + compliance screening     |

### Admin

| Method   | Endpoint                             | Description                           |
|----------|--------------------------------------|---------------------------------------|
| `GET`    | `/sessions/{user_id}`                | List all sessions for a user          |
| `POST`   | `/admin/upload-pdf`                  | Upload & vectorize PDFs               |
| `DELETE` | `/admin/delete-document/{doc_id}`    | Delete document (storage + vectors)   |
| `PATCH`  | `/admin/users/{user_id}/role`        | Update user role                      |
| `DELETE` | `/admin/users/{user_id}`             | Delete user account                   |

### Example: Prediction Request

```json
POST /api/predict/chat

{
  "conversation_history": [
    {"role": "user", "content": "I want to predict a delay"},
    {"role": "ai", "content": "Sure! What are the shipment details?"}
  ],
  "message": "Import by Sea, 5000 kg, from China to Morocco, HS code 8703"
}
```

**Response (success):**

```json
{
  "status": "success",
  "message": "**Predicted Customs Clearance Delay: 4.2 days**\n\n**Live Environment Conditions:**\n- China Weather: Clear (severity 1/5)\n- Morocco Weather: Mild (severity 2/5)\n...",
  "prediction_data": {
    "delay_days": 4.2,
    "shap_causes": [...],
    "document_warning": "This HS code requires an IMANOR conformity certificate document. I am assuming your paperwork is perfectly compliant to calculate this physical delay.",
    "variables": { "direction": "Import", "transport_mode": "Sea", "weight": 5000, "origin": "China", "destination": "Morocco" }
  }
}
```

---

## 🤖 Agent Architecture

### 1. Orchestrator (General Q&A)

The **LangGraph Orchestrator** (`orchestrator.py`) routes user questions to the correct tool:

| Question Type                                      | Routed To      | Data Source                        |
|----------------------------------------------------|----------------|------------------------------------|
| HS codes, tariff rates, taxes, product lookups      | **SQL Agent**  | PostgreSQL structured tables       |
| Laws, customs procedures, regulations, definitions  | **RAG Agent**  | pgvector (`documents` collection)  |

### 2. Prediction Agent (Delay Forecasting)

The **LangGraph Prediction Agent** (`agents/prediction_agent.py`) is a deterministic 5-node state machine:

| Node                 | Purpose                                                 | Constraint                              |
|----------------------|---------------------------------------------------------|-----------------------------------------|
| `extraction_node`    | Parse user text for 5 required variables                | NO guessing — routes to END if missing  |
| `sql_node`           | Look up HS nomenclature data                            | **ONLY** `hs_nomenclature` table        |
| `rag_node`           | Search for required compliance documents                | **BOTH** `documents` + `document_p`     |
| `environment_node`   | Fetch live weather + port congestion scores (1–5)       | OpenWeather API + mock congestion       |
| `ml_prediction_node` | Run `.pkl` model, SHAP explainer, format response       | Reports live weather & doc assumptions  |

**Required Variables** (all 5 must be explicitly stated — no inference):

1. **Direction** — Import or Export
2. **Transport Mode** — Sea or Air
3. **Weight** — in kilograms
4. **Origin** — country or port
5. **Destination** — country or port

### 3. Environment APIs (`utils/environment_api.py`)

| Function                          | Source          | Returns                                     |
|-----------------------------------|-----------------|----------------------------------------------|
| `get_live_weather(city)`          | OpenWeather API | Integer 1–5 (1=Clear, 5=Severe Storm)       |
| `get_mock_port_congestion(port)`  | Mock (weighted) | Integer 1–5 (1=Empty, 5=Gridlock)           |

---

## 🗄️ Database (Supabase)

The project uses **Supabase** (hosted PostgreSQL + pgvector) — no local database setup required.

| Table                      | Used By            | Purpose                                |
|----------------------------|--------------------|----------------------------------------|
| `chat_history`             | `main.py`          | Session message persistence            |
| `documents`                | RAG Agent          | pgvector embeddings (legal PDFs)       |
| `document_p`               | RAG Agent          | Additional pgvector collection         |
| `hs_nomenclature`          | SQL Agent          | HS code classifications & descriptions |
| `optimisation_data`        | Routing Engine     | Multimodal routes & transport costs    |
| `langchain_pg_collection`  | RAG Agent          | LangChain vector metadata              |
| `langchain_pg_embedding`   | RAG Agent          | LangChain vector storage               |
| `user_profiles`            | `main.py`          | User roles & authentication            |

> [!NOTE]
> The SQL Agent **ignores** all vector/RAG tables (`documents`, `langchain_pg_collection`, `langchain_pg_embedding`) and only queries structured trade data tables.

---

## 📦 Technology Stack

| Layer            | Technology                                               |
|------------------|----------------------------------------------------------|
| **Frontend**     | React 18, Vite, TypeScript, Supabase JS SDK              |
| **Backend**      | FastAPI, Uvicorn, Python 3.10+                           |
| **LLM**          | Groq Cloud — `meta-llama/llama-4-scout-17b-16e-instruct` |
| **LLM Framework**| LangChain + LangGraph                                    |
| **Embeddings**   | `BAAI/bge-m3` via HuggingFace                           |
| **Database**     | Supabase (PostgreSQL + pgvector)                         |
| **Weather Data** | OpenWeather API (free tier)                              |
| **PDF Parsing**  | LlamaParse (LlamaCloud)                                  |
| **ML Models**    | scikit-learn / XGBoost (pickled pipelines)                |
| **Explainability**| SHAP (TreeExplainer → feature_importances_ fallback)    |

---

## 🐛 Troubleshooting

| Problem                                   | Cause                          | Fix                                                         |
|-------------------------------------------|--------------------------------|--------------------------------------------------------------|
| `ModuleNotFoundError`                     | Missing Python package         | Run `pip install -r requirements.txt`                       |
| `psycopg.OperationalError`               | DB connection failed           | Verify `DATABASE_URL` in `.env`                             |
| `AuthenticationError` (Groq)              | Invalid API key                | Verify `GROQ_API_KEY` in `.env`                             |
| Weather always defaults to 1              | Missing/invalid weather key    | Verify `OPENWEATHER_API_KEY=...` (use `=`, not `:`)         |
| Frontend can't reach backend              | CORS or port mismatch          | Backend on `:8000`, frontend on `:4200`                     |
| `ENOENT` / `vite: not found`             | Node deps missing              | Run `npm install` inside `autotrade-frontend/`              |
| Slow first boot                           | Embedding model downloading    | Wait for the one-time `BAAI/bge-m3` download (~570 MB)      |
| PowerShell execution policy error         | Windows default restriction    | `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`       |
