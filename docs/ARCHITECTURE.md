# NexusOS Architecture

NexusOS is an AI Operating System SaaS that unifies research, business intelligence, AI agents, and life admin into one orchestrated platform.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Next.js)                          │
│  Home │ Research │ Business Brain │ Agents │ Life Admin │ ...   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     API Layer (Route Handlers)                     │
│  Auth │ Chat │ Research │ Memory │ Documents │ Stripe │ Usage   │
└─────┬──────────┬──────────┬──────────┬──────────┬───────────────┘
      │          │          │          │          │
┌─────▼──┐  ┌────▼────┐ ┌───▼───┐ ┌───▼───┐ ┌───▼────┐
│Postgres│  │  Redis  │ │  S3   │ │Stripe │ │AI APIs │
│pgvector│  │ BullMQ  │ │Storage│ │Billing│ │OAI/Cl/ │
└────────┘  └─────────┘ └───────┘ └───────┘ │Gemini  │
                                             └────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Auth | NextAuth v5 (Auth.js), bcrypt, Google OAuth, email verification |
| Database | PostgreSQL + Prisma ORM + pgvector extension |
| Cache/Queue | Redis + BullMQ for background AI tasks |
| Storage | S3-compatible object storage (AWS S3 / MinIO) |
| Payments | Stripe Checkout, Customer Portal, verified webhooks |
| AI | Provider abstraction supporting OpenAI, Anthropic, Gemini |

## Multi-Tenancy Model

- **User**: Individual account with auth credentials
- **Organization**: Workspace container (personal org auto-created on signup)
- **Membership**: User ↔ Organization with roles (`OWNER`, `ADMIN`, `MEMBER`)
- All resources (conversations, documents, agents, etc.) are scoped to `organizationId`

## AI Architecture

### Provider Abstraction (`src/lib/ai/providers/`)

```typescript
interface AIProvider {
  chat(params: ChatParams): Promise<ChatResponse>
  embed(text: string): Promise<number[]>
}
```

Implementations: `OpenAIProvider`, `AnthropicProvider`, `GeminiProvider`

Selection via `AI_PROVIDER` env var or per-organization settings.

### Agent Orchestration (`src/lib/ai/orchestrator.ts`)

1. Parse user goal from home input
2. Classify intent (research, business, agent, life-admin, general)
3. Select tools and agent persona
4. Execute tool calls with human approval gate for consequential actions
5. Persist results to memory and conversation history

### Tool System (`src/lib/ai/tools/`)

- `web_search` — Tavily API for research
- `memory_search` — pgvector similarity search
- `memory_store` — persist facts/preferences
- `document_search` — RAG over uploaded documents
- `create_task` — task management
- `request_approval` — human-in-the-loop gate

### Background Jobs (`src/lib/queue/`)

BullMQ workers process:
- Research report generation
- Document embedding/chunking
- Long-running agent runs

## Data Model

### Core Tables
- `users`, `accounts`, `sessions`, `verification_tokens` (Auth.js)
- `organizations`, `memberships`
- `subscriptions` (Stripe-synced, never trust frontend)

### AI Tables
- `conversations`, `messages`
- `memories` (with vector embeddings)
- `documents`, `document_chunks` (with vector embeddings)
- `research_projects`, `research_reports`
- `agents`, `agent_runs`
- `tasks`

### Ops Tables
- `usage_records` — monthly metering per org
- `integrations` — encrypted credentials
- `audit_logs` — security/compliance trail

## Security

- Server-side API keys only (never exposed to client)
- Organization-scoped authorization on every query
- Rate limiting via Upstash Redis (or in-memory fallback)
- Zod validation on all API inputs
- Presigned S3 uploads with size/type validation
- AES-256-GCM encryption for integration credentials
- Audit logging for sensitive operations
- Stripe webhooks verified with `STRIPE_WEBHOOK_SECRET`

## Subscription Flow

```
User clicks Upgrade → POST /api/stripe/checkout → Stripe Checkout
                                                        │
                              checkout.session.completed (webhook)
                                                        │
                              Update subscription in DB ←┘
                              (NEVER trust frontend redirect)
```

## Phase Roadmap

### Phase 1 (Current) ✅
- Authentication (email/password, Google, verification, reset, deletion)
- Dashboard with unified home input
- AI Chat with provider abstraction
- Research Analyst (projects, web search, reports)
- Memory system (store + vector search)
- File upload (S3 + document chunking)
- Pricing page + Stripe (checkout, portal, webhooks)

### Phase 2
- Business Brain (RAG over company documents)
- AI Agents (Researcher, BA, Marketing, Sales, Ops, EA)
- Agent orchestration + approval workflows
- Tasks module

### Phase 3
- Life Admin (reminders, travel, productivity)
- Integrations (Google Drive, Slack, etc.)
- Automation + monitoring dashboards

## Directory Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register, verify, reset
│   ├── (dashboard)/     # Protected app pages
│   └── api/             # Route handlers
├── components/
│   ├── ui/              # shadcn primitives
│   ├── layout/          # Sidebar, header
│   ├── chat/            # Chat interface
│   └── ...
├── lib/
│   ├── ai/              # Providers, orchestrator, tools
│   ├── auth/            # NextAuth config
│   ├── db/              # Prisma client
│   ├── stripe/          # Stripe helpers
│   ├── storage/         # S3 client
│   ├── queue/           # BullMQ
│   ├── encryption/      # Credential encryption
│   └── usage/           # Plan limits
└── types/
```
