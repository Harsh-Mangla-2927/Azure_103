# Campus Placement AI

AI-powered campus placement preparation and eligibility platform built with React, Express, SQLite, and Azure AI Foundry.

## Quick Start

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `FOUNDRY_PROJECT_ENDPOINT` — your Azure AI Foundry project endpoint URL
- `FOUNDRY_AGENT_NAME` — defaults to `CampusPlacementAgent`
- `JWT_SECRET` — a strong random secret (e.g. `openssl rand -hex 32`)

### 3. Run the application

```bash
npm run dev
```

This starts:
- Backend API at **http://localhost:3001**
- Frontend at **http://localhost:5173**

---

## Architecture

```
NEW_AZURE_WEB_AGENT/
├── client/              # React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── components/  # Reusable Art Deco UI components
│       ├── pages/       # All application pages
│       ├── hooks/       # useAuth, useProfile
│       ├── lib/         # API client, auth helpers
│       └── types/       # TypeScript interfaces
│
├── server/              # Express + TypeScript
│   └── src/
│       ├── db/          # SQLite database + schema
│       ├── middleware/  # JWT auth, multer upload
│       ├── routes/      # REST API routes
│       └── services/    # Azure AI Foundry, resume extractor
│
├── .env.example         # Environment template
├── .gitignore
└── package.json         # Root scripts
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `FOUNDRY_PROJECT_ENDPOINT` | ✅ | Azure AI Foundry project endpoint |
| `FOUNDRY_AGENT_NAME` | ✅ | Agent name (default: CampusPlacementAgent) |
| `JWT_SECRET` | ✅ | Strong random string for JWT signing |
| `PORT` | ❌ | Server port (default: 3001) |
| `DATABASE_PATH` | ❌ | SQLite db path (default: ./data/campus_placement.db) |
| `UPLOAD_DIR` | ❌ | Resume upload directory (default: ./uploads) |
| `MAX_FILE_SIZE_MB` | ❌ | Max upload size in MB (default: 5) |

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start both frontend and backend |
| `npm run client` | Start frontend only |
| `npm run server` | Start backend only |
| `npm run build` | Build for production |
| `npm run install:all` | Install all dependencies |

## Azure AI Foundry Setup

The backend communicates with the existing `CampusPlacementAgent` using
- `DefaultAzureCredential` for authentication
- `AIProjectClient` from `@azure/ai-projects`

Ensure you are logged in with `az login` or have a managed identity configured.

## Security Notes

- Azure credentials **never** reach the frontend
- Passwords are hashed with bcrypt (12 rounds)
- JWT tokens expire after 7 days
- Uploaded files are stored server-side only
- `.env` is in `.gitignore`
