# AI CV Evaluator – Backend Service

The **AI CV Evaluator** is a backend service designed for a Backend Developer Case Study.  
Its purpose is to automate the candidate screening process by evaluating **CVs** and **Project Reports** using **Retrieval‑Augmented Generation (RAG)** and Large Language Models (LLMs).

The system receives candidate documents, compares them with internal **Ground Truth** (Job Description & Scoring Rubric), and generates a structured evaluation report.

---

## 🚀 Tech Stack

| Component | Technology |
|----------|------------|
| Framework | NestJS (Node.js) |
| Language | TypeScript |
| ORM | Prisma + PostgreSQL |
| Vector Database | Qdrant |
| Job Queue | BullMQ (Redis) |
| AI Provider | Google Gemini |
| Containerization | Docker & Docker Compose |
| PDF Parsing | pdfjs-dist |

---

## ✨ Key Features

### **1. `POST /api/upload`**
- Accepts two PDF files: `cv` and `report`.
- Saves files into the local `/uploads` directory.
- Stores metadata into PostgreSQL.
- Returns:
```json
{
  "cvDocumentId": "...",
  "reportDocumentId": "..."
}
```

---

### **2. `POST /api/evaluate`**
Accepts:
```json
{
  "cvId": "...",
  "reportId": "...",
  "title": "Product Engineer (Backend)"
}
```

Behavior:
- Creates a new Job with status `queued`.
- Pushes the job into BullMQ (Redis).
- Responds immediately (non‑blocking):
```json
{
  "id": "JOB_ID",
  "status": "queued"
}
```

---

### **3. `GET /api/result/:id`**
Returns job status or evaluation result.

- If still in progress:
```json
{ "id": "...", "status": "processing" }
```

- If completed:
Returns full evaluation including scores, match rate, feedback, and summary.

---

## ⚙️ Installation & Setup

### **1. Prerequisites**
- Node.js 20+
- Yarn Classic (1.x)
- Docker & Docker Compose

---

### **2. Clone the Repository**
```bash
git clone https://github.com/rahadyanws/ai-cv-evaluator
cd ai-cv-evaluator
```

---

### **3. Install Dependencies**
```bash
yarn install
```

---

### **4. Create `.env` File**
Create a file named `.env` in the project root:

```env
# DATABASE
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_cv_evaluator?schema=public"

# QUEUE / REDIS
REDIS_HOST=localhost
REDIS_PORT=6379

# GEMINI API (REQUIRED)
GEMINI_API_KEY="AIza..."
```

Get your Gemini API key:  
https://aistudio.google.com/

---

### **5. Start External Services (Docker)**
```bash
docker-compose up -d
```

This starts:
- PostgreSQL
- Redis
- Qdrant

---

### **6. Run Database Migration**
```bash
npx prisma migrate dev
```

---

### **7. Prepare Ground Truth Documents**
Inside the folder:

```
/documents
```

Provide:

| File | Description |
|------|-------------|
| `job-description.txt` | Job Description (Case Study pages 7–8) |
| `scoring-rubric.txt` | Evaluation Rubric (Case Study page 4) |

---

### **8. Start the Application**
```bash
yarn start:dev
```

Your server will run at:
```
http://localhost:3000
```

On startup, RagService will automatically ingest Ground Truth into Qdrant.

---

## 🧪 Testing the API (Postman Recommended)

### **1) Upload Documents**
**POST** `http://localhost:3000/api/upload`  
Body → `form-data`:

| Key | Type | Value |
|-----|------|--------|
| cv | File | CV (PDF) |
| report | File | Project Report (PDF) |

Copy `cvDocumentId` and `reportDocumentId`.

---

### **2) Start Evaluation**
**POST** `http://localhost:3000/api/evaluate`

```json
{
  "cvId": "ID_FROM_UPLOAD",
  "reportId": "ID_FROM_UPLOAD",
  "title": "Product Engineer (Backend)"
}
```

---

### **3) Retrieve Result**
**GET**  
`http://localhost:3000/api/result/JOB_ID`

---

## 🧠 Architecture Overview

### **1. Modular NestJS Structure**
Modules include:

- UploadModule  
- EvaluateModule  
- ResultModule  
- WorkerModule  
- LlmModule  
- RagModule  
- JobsModule  

Each module has a single responsibility ensuring clean and maintainable architecture.

---

### **2. Asynchronous Processing (BullMQ + Redis)**

Reason:
- AI evaluation may take 15–60 seconds.
- API requests must remain fast.

Design:
- `EvaluateService` → Job producer  
- `WorkerService` → Job consumer  

Retry mechanism:
- `attempts: 3`  
- `backoff: 5000`  

---

### **3. Retrieval-Augmented Generation (RAG)**

Ensures evaluation is based on true standards (rubric), not LLM assumptions.

Flow:
1. RagService ingests Ground Truth on startup  
2. Worker queries Qdrant for relevant context  
3. LLM receives augmented prompt for evaluation  

---

### **4. Google Gemini (LLM Provider)**

- Free to use  
- Sometimes returns 503 (busy)  
- This tests system resilience  
- BullMQ handles automatic retries  

---

## 📜 License
This project is created for educational and assessment purposes for the Backend Developer Case Study.

