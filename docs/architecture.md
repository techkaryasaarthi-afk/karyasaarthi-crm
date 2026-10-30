# Unified CRM System Architecture

The Karya Saarthi Unified CRM is architected as a **high-throughput, multi-tenant-ready, single-core platform** that consolidates four distinct customer-facing digital surfaces into one operational backbone.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph SURFACES["Customer-Facing Surfaces"]
        S1["karyasaarthi.com<br/>(Global Agency & Consulting)"]
        S2["karyasaarthi.in<br/>(India Business & MSME Services)"]
        S3["career.karyasaarthi.com<br/>(Talent Portal & ATS)"]
        S4["Mobile App<br/>(iOS & Android Client/Vendor Portal)"]
    end

    subgraph SECURITY["Edge & Security Layer"]
        WAF["Reverse Proxy / SSL Termination"]
        RL["Anti-Abuse Rate Limiter<br/>(Public Forms: 5-20 req/m, Auth: 5 req/15m)"]
        CORS["Strict Surface CORS Policy"]
    end

    subgraph API["NestJS Core API Gateway (/api/v1)"]
        AUTH["Auth & RBAC Guards<br/>(JWT Bearer, Roles: ADMIN, PM, SALES, VENDOR, CLIENT)"]
        IDRES["Unified Identity Resolution Engine<br/>(Matches phone/email to canonical Person)"]
        ROUT["Priority Routing Engine<br/>(Rule builder matching Surface, Service & Urgency)"]
        AI["AI Assist Layer<br/>(Claude 3.5 Sonnet / Haiku Tiering)"]
        BUS["Centralized CRM Event Bus<br/>(EventEmitter2 Decoupled Event System)"]
    end

    subgraph MODULES["Core Business Modules"]
        MOD_LEAD["Leads & 15-Min SLA Engine"]
        MOD_INBOX["Omnichannel Inbox & Chat"]
        MOD_PROJ["Projects, Milestones & Deliverables"]
        MOD_BILL["Billing, Invoicing & Razorpay Reconciliation"]
        MOD_ATS["Careers ATS & Ambassador Tracking"]
        MOD_CMS["Content CMS & S3/Disk File Vault"]
        MOD_COMMS["Multi-Channel Comms Engine<br/>(WhatsApp, Email, Push/FCM, SMS)"]
        MOD_PRIV["Privacy & Retention Engine<br/>(GDPR/DPDP Erasure & Portability)"]
    end

    subgraph DATA["Persistence & Third-Party Infrastructure"]
        DB[("Neon PostgreSQL<br/>(Connection Pooling + Direct URL)")]
        PRISMA["Prisma ORM 5.14"]
        RZP["Razorpay Gateway API"]
        CLAUDE["Anthropic Claude API"]
        CHANNELS["External Comms Gateways<br/>(Twilio, SendGrid, FCM, MSG91)"]
    end

    SURFACES --> WAF --> RL --> CORS --> API
    AUTH --> IDRES --> ROUT
    API --> MODULES
    MODULES --> BUS
    BUS --> MOD_COMMS
    MOD_COMMS --> CHANNELS
    MODULES --> PRISMA --> DB
    MOD_BILL --> RZP
    AI --> CLAUDE
```

---

## 2. Multi-Surface Ingestion & Unified Identity Flow

All surfaces emit events with standard headers: `x-surface: SITE_COM | SITE_IN | CAREER | APP`.
1. **Request Reception**: Request is evaluated against the `RateLimitGuard`.
2. **Identity Resolution**: `PersonsService.findOrCreatePerson` checks if an email or phone number matches an existing `Person`.
   - If found: Updates `consentFlags`, tags, and surface timestamps.
   - If new: Creates a canonical `Person` record and tags the `firstSeenSurface`.
3. **Omnichannel Ingestion**: An `Interaction` is logged linking the raw payload and headers to the `Person`.
4. **Pipeline Routing**: If the interaction creates a `Lead`, `RoutingRules` are evaluated by priority order, assigning the appropriate `Staff` member and starting a 15-minute SLA timer.
5. **Event Bus Dispatch**: An event (e.g. `lead.created`) fires asynchronously via `CrmEventBusService`, dispatching confirmation comms (Email/WhatsApp) while checking the user's DPDP/GDPR consent preferences.

---

## 3. Security & Compliance Architecture
- **Authentication**: Stateless JWT with HMAC SHA-256 tokens; role-based route guards (`@Roles(StaffRole.ADMIN, ...)`).
- **Rate Limiting**: In-memory token bucket tracking per IP/identifier to protect public inquiry forms from spam attacks.
- **Data Privacy**: Complete erasure endpoints (`/api/v1/persons/:id/erase`) that redact PII while preserving financial audits for legal/accounting compliance.
- **Audit Logging**: Every mutation on sensitive entities (Leads, Projects, Invoices, Comms) creates an immutable record in `AuditLog`.
