# CareerAI

This file documents what _this repository actually contains_. It avoids inferred features and is based on the code in this workspace.

Summary
- Monorepo with two workspaces: client/ and server/
- client/: Vite + React single-page application (Tailwind, react-query, HeyGen avatar SDKs)
- server/: Express API using Node.js and Mongoose (MongoDB)
- AI integration: OpenRouter (openrouter.ai) for embeddings/LLM calls (see server/src/services/ai)
- Embeddings are stored on MongoDB documents (DocumentChunk, Memory) and scored with an in-process cosine similarity implementation

Table of contents
- Project overview
- What's in this repo
- Tech stack
- How to run
- Environment variables
- Server routes
- Data model
- AI & RAG behavior
- Security note about .env.example
- Next actions 

---

What this repository actually contains

1) Root package.json defines two workspaces: client and server.
   - `npm run dev` runs both client and server in parallel (uses concurrently)
   - `npm run build` builds the client workspace
   - `npm run start` runs the server workspace

2) client/
   - Vite-powered React app (JSX files under client/src)
   - Tailwind CSS present (tailwind.config.js)
   - Packages include react, react-dom, react-query, react-hook-form, react-router-dom, Tailwind, and HeyGen avatar SDKs
   - Pages include Dashboard, Jobs, Resume, Interviews, Coach, Memory, Auth flows

3) server/
   - Express app (server/src/app.js) with mounted routers for auth, resumes, jobs, coach, memories, interviews, avatar, analytics
   - MongoDB (Mongoose) models under server/src/models (User, Resume, DocumentChunk, Job, Memory, Interview, Conversation, Message, RefreshToken)
   - AI services under server/src/services/ai using OpenRouter to create embeddings and orchestrate RAG
   - Resume parsing uses libraries like mammoth and pdf-parse
   - Cloudinary integration present (server/src/services/cloudinary.service.js)
   - Passport with GitHub and Google strategies configured (server/src/config/passport.js)
   - Multer used for file uploads

Tech stack (exact packages and frameworks from package.json)
- Frontend: react, react-dom, vite, tailwindcss, @tanstack/react-query, react-hook-form, react-router-dom, framer-motion, recharts, lucide-react
- Backend: express, mongoose, passport, passport-google-oauth20, passport-github2, jsonwebtoken, multer, mammoth, pdf-parse, cloudinary, twilio, zod
- Dev tooling: concurrently in root, Vite in client

How to run (exact commands)

Install dependencies (root will install both workspaces):

```bash
npm install
```

Start both client and server in dev mode (root):

```bash
npm run dev
```

Start only the server (helpful for API work):

```bash
npm run dev --workspace server
```

Build the client:

```bash
npm run build --workspace client
```

Start the server for production (no build step provided for server beyond starting src/server.js):

```bash
npm run start --workspace server
```

Environment variables (the server expects these — see .env.example)

Do not paste real secrets here. The variables are:
- NODE_ENV
- PORT
- CLIENT_URL
- SERVER_URL
- MONGO_URI
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- SESSION_SECRET
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
- GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
- OPENROUTER_API_KEY
- OPENROUTER_COACH_MODEL
- OPENROUTER_INTERVIEW_MODEL
- OPENROUTER_EMBEDDING_MODEL
- OPENROUTER_SITE_URL
- OPENROUTER_APP_NAME
- CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET / CLOUDINARY_RESUME_FOLDER
- AVATAR_PROVIDER

Server routes (where to look and what exists)
- Health check: GET /api/health
- Auth: routes mounted at /api/auth (server/src/routes/auth.routes.js)
- Resumes: /api/resumes (upload, parsing) (server/src/routes/resume.routes.js)
- Jobs: /api/jobs (server/src/routes/job.routes.js)
- Coach: /api/coach (server/src/routes/coach.routes.js)
- Memories: /api/memories (server/src/routes/memory.routes.js)
- Interviews: /api/interviews (server/src/routes/interview.routes.js)
- Avatar: /api/avatar (server/src/routes/avatar.routes.js)
- Analytics: /api/analytics (server/src/routes/analytics.routes.js)

Data model (models present in server/src/models)
- User.js — user accounts and profile fields
- Resume.js — uploaded resume metadata and rawText
- DocumentChunk.js — RAG chunks produced from resumes/jobs/interviews/memories
- Job.js — job postings
- Memory.js — saved memory items (with embeddings)
- Interview.js, Conversation.js, Message.js — chat/interview data models
- RefreshToken.js — refresh token storage

AI & RAG behavior (exact implementation details)
- Chunking: implemented in server/src/services/ai/rag.service.js (chunkText)
- Embeddings: server/src/services/ai/embedding.service.js calls OpenRouter's embeddings endpoint and returns embedding arrays
- Scoring: cosineSimilarity and lexicalScore are implemented in embedding.service.js and used to rank DocumentChunk and Memory records
- Indexing: indexDocumentChunks inserts DocumentChunk documents with embedding arrays (stored in MongoDB)
- Retrieval: retrieveRagContext pulls DocumentChunk and Memory documents from MongoDB, computes scores, and returns top results

Security note (important)

The repository's `.env.example` currently contains non-empty values for some keys. If those are valid credentials (for GitHub, Cloudinary, etc.), they have been exposed and should be rotated immediately. Never keep real credentials in a committed `.env.example` file. Replace them with placeholders and document how to provision real secrets securely.
