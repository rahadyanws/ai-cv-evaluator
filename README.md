# AI-Powered CV Evaluation Service (Case Study)

This project is a backend service designed for a Backend Developer case study. Its mission is to automate the initial candidate screening process by evaluating **CVs** and **Project Reports** against **Ground Truth** documents (such as Job Descriptions and Scoring Rubrics) using a resilient, AI-driven workflow.

The service receives candidate documents, processes them through a Retrieval-Augmented Generation (RAG) pipeline, and generates a structured evaluation report.

---

## 🚀 Tech Stack

- **Framework:** NestJS (Node.js)  
- **Language:** TypeScript  
- **Main DB:** PostgreSQL (Managed through Prisma ORM)  
- **Vector Database (RAG):** Qdrant  
- **Job Queue:** BullMQ (Redis-backed)  
- **LLM Service:** Google Gemini (via Google AI Studio)  
- **Authentication:** Global Static API Key (NestJS Guards)  
- **Other Tools:** Docker & Docker Compose, pdfjs-dist for PDF text extraction  

---

## ✨ Core Features

All endpoints are protected using a **global API key**.

### **1. POST /api/upload**
- Accepts two PDF files via multipart/form-data:
  - `cv`
  - `report`
- Stores files in `/uploads` using local storage.
- Stores metadata in the PostgreSQL **Document** table.
- Returns:
```json
{
  "cvDocumentId": "...",
  "reportDocumentId": "..."
}
```

---

### **2. POST /api/evaluate**
Accepts:
```json
{
  "cvId": "...",
  "reportId": "...",
  "title": "Product Engineer (Backend)"
}
```

Behavior:
- Validates input.
- Creates a **Job** entry in PostgreSQL with status `queued`.
- Pushes the job into BullMQ (Redis) for background processing.
- Returns **202 Accepted** immediately:
```json
{
  "id": "JOB_ID",
  "status": "queued"
}
```

---

### **3. GET /api/result/:id**
- Poll job status.
- If queued/processing:
```json
{ "id": "...", "status": "processing" }
```
- If completed:
Returns the full AI evaluation including:
- Scores
- Feedback
- Summary
- Structured JSON output stored in the Result table

---

## ⚙️ How to Run (Setup Instructions)

### **Prerequisites**
Make sure you have installed:
- Node.js v20+
- Yarn Classic (1.x)
- Docker & Docker Compose

---

## Installation Steps

### **1. Clone Repository**
```bash
git clone [YOUR_REPOSITORY_URL]
cd ai-cv-evaluator
```

---

### **2. Install Dependencies**
```bash
yarn install
```

---

### **3. Set Up Environment Variables (`.env`)**
Create a `.env` file in project root:

```env
# Database config
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_cv_evaluator?schema=public"

# Queue config
REDIS_HOST=localhost
REDIS_PORT=6379

# Google Gemini API Key (Required)
GEMINI_API_KEY="AIza..."

# API Authentication Key (Required)
SECRET_API_KEY="your-super-secret-and-long-api-key-12345"
```

---

### **4. Start External Services (Docker)**
```bash
docker-compose up -d
```

Services started:
- PostgreSQL  
- Redis  
- Qdrant  

---

### **5. Run Prisma Migration**
```bash
npx prisma migrate dev
```

---

### **6. Populate Ground Truth Documents (Mandatory)**

Navigate to `/documents` folder and fill:

| File | Description |
|------|-------------|
| `job-description.txt` | Job Description for evaluation |
| `scoring-rubric.txt` | Candidate scoring rubric |

---

### **7. Start the Application**
```bash
yarn start:dev
```

Server runs at:
```
http://localhost:3000
```

On startup, RagService will automatically ingest Ground Truth documents into Qdrant.

---

## 🧪 How to Test (Postman Workflow)

### **IMPORTANT: Every request must include the API key header:**
```
x-api-key: your-super-secret-and-long-api-key-12345
```

If missing, server returns:
```
401 Unauthorized
```

---

### 1) Upload CV & Report  
**POST:** `/api/upload`  
Body → form-data:
- cv → File (PDF)
- report → File (PDF)

Copy returned:
- `cvDocumentId`
- `reportDocumentId`

---

### 2) Start Evaluation  
**POST:** `/api/evaluate`
```json
{
  "cvId": "ID_FROM_UPLOAD",
  "reportId": "ID_FROM_UPLOAD",
  "title": "Product Engineer (Backend)"
}
```

Response:
```json
{
  "id": "...",
  "status": "queued"
}
```

---

### 3) Get Evaluation Result  
**GET:** `/api/result/JOB_ID`  
- If processing:
```json
{ "status": "processing" }
```
- When done → returns full structured AI evaluation JSON

---

## 🧠 Design & Architecture Choices

### **1. NestJS Modularity**
Benefits:
- Clean separation of concerns
- Scalable structure

Modules:
- UploadModule
- EvaluateModule
- ResultModule
- AuthModule (API Key Guard)
- WorkerModule
- JobsModule
- LlmModule
- RagModule

---

### **2. Asynchronous Processing (BullMQ + Redis)**

Why:
- AI pipeline is slow (30–60 seconds)

Solution:
- EvaluateService pushes jobs to queue
- WorkerModule consumes jobs in background  
- Retry config:
  ```
  attempts: 3
  backoff: 5000
  ```

---

### **3. RAG (Retrieval-Augmented Generation) with Qdrant**

Pipeline:
1. On startup → RagService ingests Ground Truth documents  
2. Chunking → Embeddings → Qdrant storage  
3. Worker retrieves relevant context before AI evaluation  
4. Context is injected into LLM prompts

Ensures:
- Evaluation based on real scoring rules
- No hallucination

---

### **4. Google Gemini + Retry Handling**

Gemini free tier sometimes fails:
- 503 Service Unavailable

The system handles this via:
- LlmService throws error
- BullMQ retry system handles transient failures

---

### **5. PDF Parsing via `pdfjs-dist` (Legacy Build)**

Reason:
- pdf-parse caused ESM/CJS issues  
- pdfjs-dist browser build requires DOMMatrix  
- Legacy build solves Node.js compatibility problems

---

## 📌 Optional Section — To Be Filled by You

You can add:
- Results screenshots
- Postman outputs
- Worker logs
- Analysis and reflections

---

## 📜 License
This project is intended solely for technical assessment purposes within the Backend Developer Case Study.
