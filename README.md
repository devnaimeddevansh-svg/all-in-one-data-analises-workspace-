# NexusOS — AI Operating System

NexusOS is a production-ready SaaS platform that unifies AI research, business intelligence, AI agents, and life admin into one orchestrated experience.

## Features (Phase 1)

- **Authentication** — Email/password, Google OAuth, email verification, password reset, secure sessions, account deletion
- **AI Chat** — Unified home input powered by Groq (Llama 3.3)
- **Research Analyst** — Web search, source citations, reports, and recommendations
- **Memory** — Persistent vector-based memory with semantic search (pgvector)
- **Business Brain** — Document upload, chunking, embedding, and RAG search
- **Stripe Billing** — Checkout, subscriptions, customer portal, webhooks, usage tracking
- **Usage Metering** — Plan-based limits for AI tasks, research projects, and storage

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Auth | NextAuth v5 (Auth.js) |
| Database | PostgreSQL + Prisma + pgvector |
| Queue | Redis + BullMQ |
| Storage | S3-compatible (MinIO/AWS) |
| Payments | Stripe |

## Quick Start

### 1. Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL, Redis, MinIO)

### 2. Start Infrastructure

```bash
docker compose up -d
```

This starts:
- PostgreSQL with pgvector on port 5432
- Redis on port 6379
- MinIO (S3) on port 9000 (console: 9001)

Create the MinIO bucket:
```bash
# Access MinIO console at http://localhost:9001 (minioadmin/minioadmin)
# Create a bucket named "nexusos"
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values. Minimum required for local dev:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
ENCRYPTION_KEY=<run: openssl rand -hex 32>
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexusos?schema=public
REDIS_URL=redis://localhost:6379
AI_PROVIDER=groq
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
S3_BUCKET=nexusos
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true
```

### 4. Database Setup

```bash
npm install
npx prisma migrate deploy
# or for development:
npx prisma migrate dev
```

### 5. Run the App

```bash
# Terminal 1: Next.js dev server
npm run dev

# Terminal 2: Background job worker (optional, falls back to sync processing)
npm run worker
```

Open http://localhost:3000

## Stripe Setup (TEST mode)

1. Create a [Stripe account](https://dashboard.stripe.com/register)
2. Switch to **Test mode**
3. Create three Products with monthly recurring prices:
   - Pro ($29/month)
   - Business ($99/month)
   - Scale ($299/month)
4. Copy price IDs to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_PRO_PRICE_ID=price_...
   STRIPE_BUSINESS_PRICE_ID=price_...
   STRIPE_SCALE_PRICE_ID=price_...
   ```
5. Set up webhook forwarding for local dev:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
6. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

Subscription status is **only** updated from verified Stripe webhooks — never from frontend redirects.

## AI Provider Configuration

NexusOS uses **Groq** for fast LLM inference.

```env
AI_PROVIDER=groq
GROQ_API_KEY=your-key-from-console.groq.com
GROQ_MODEL=llama-3.3-70b-versatile
```

Memory and document search use local embeddings when no cloud embedding API is configured.

For web search in Research, configure `TAVILY_API_KEY` (get one at https://tavily.com).

## Testing

```bash
npm test
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register, verify, reset
│   ├── dashboard/       # Protected app pages
│   └── api/             # Route handlers
├── components/          # UI components
├── lib/
│   ├── ai/              # Provider abstraction, orchestrator, tools
│   ├── auth/            # NextAuth configuration
│   ├── stripe/          # Stripe integration
│   ├── storage/         # S3 client
│   ├── queue/           # BullMQ workers
│   └── usage/           # Plan limits and metering
└── generated/prisma/    # Prisma client
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full architecture details.

## Pricing Plans

| Plan | Price | AI Tasks | Research | Agents | Storage |
|------|-------|----------|----------|--------|---------|
| Free | $0 | 10/mo | 3/mo | 1 | 1GB |
| Pro | $29 | 100/mo | 30/mo | 10 | 25GB |
| Business | $99 | 500/mo | 100/mo | 25 | 250GB |
| Scale | $299 | 2,000/mo | 500/mo | 100 | 1TB |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | Custom |

## Remaining Work

### Phase 2
- [ ] Business Brain chat interface (RAG Q&A over documents)
- [ ] AI Agents (create, configure, run with approval workflows)
- [ ] Agent orchestration with multi-step execution
- [ ] Tasks module (CRUD, due dates, priorities)

### Phase 3
- [ ] Life Admin (reminders, travel planning, productivity)
- [ ] Integrations (Google Drive, Slack, Notion, HubSpot)
- [ ] Automation and monitoring dashboards
- [ ] Team workspace and organization switching
- [ ] API access for Scale plan
- [ ] Enterprise (SSO, SCIM)

### Infrastructure
- [ ] E2E tests (Playwright)
- [ ] CI/CD pipeline
- [ ] Production deployment guide (Netlify/Vercel)
- [ ] Email templates (React Email)
- [ ] PDF document parsing
- [ ] Chart generation in research reports

## License

Private — All rights reserved.
