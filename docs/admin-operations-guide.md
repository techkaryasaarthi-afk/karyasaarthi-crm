# Karya Saarthi Unified CRM — Administrator & Operations Handbook

This guide is designed for **non-technical administrators, operations staff, sales leads, and project managers** operating the Karya Saarthi Unified CRM.

---

## 1. Unified Identity & The Person Record

Unlike legacy systems where a user was isolated in separate databases for each website, our CRM uses a **single identity graph**:
- A single person may be an **Inquiry Lead** on `karyasaarthi.com`, a **Paying Client** on `karyasaarthi.in`, a **Job Applicant** on `career.karyasaarthi.com`, and a logged-in user on the **Mobile App**.
- When viewing a Person's profile in the CRM, you will see a unified activity timeline:
  - Every form submission, inbound chat message, project milestone, and billing invoice.
  - Their consent preferences (`marketingConsent`, `dataProcessingConsent`).

---

## 2. Managing Leads & The 15-Minute SLA

### How Leads are Ingested and Assigned
1. When any user submits an enquiry on `karyasaarthi.com` or `karyasaarthi.in`, a Lead is automatically created in stage `NEW`.
2. **Automated Routing**: The system checks active **Routing Rules** (configured in Admin Control Panel). If a rule matches the surface or requested service (e.g., "All high-budget leads from SITE_COM go to Senior Sales Manager"), the lead is automatically assigned.
3. If no custom rule matches, the lead is assigned via round-robin or routed to the default unassigned pool.

### The 15-Minute SLA Guarantee
- Karya Saarthi maintains a strict **15-minute first-response SLA** for all inbound leads.
- The countdown timer begins the second the lead is ingested.
- If a lead remains in `NEW` without an assigned agent or without contact within 15 minutes:
  - An automated escalation alert is sent to sales management.
  - The lead status triggers an SLA breach badge on the dashboard.
  - An event (`lead.sla_breached`) dispatches an urgent reminder notification.

### Moving Leads Through the Pipeline
- **Stages**: `NEW` ➔ `CONTACTED` ➔ `QUALIFIED` ➔ `PROPOSAL_SENT` ➔ `NEGOTIATION` ➔ `WON` (or `LOST`).
- When a lead is marked `WON`, you can convert the lead into a **Project** with one click. All client requirements and attachments are automatically ported over.

---

## 3. Project & Vendor Management

### Milestones & Deliverables
- Each project can be partitioned into milestones with target delivery dates and percentage weighting.
- Deliverables submitted by vendors/freelancers go through the review workflow:
  - `DRAFT` ➔ `SUBMITTED` ➔ `APPROVED` (or `REJECTED`).
- If a client requests changes, open a **Revision Request** with specific feedback. The system notifies the assigned vendor and tracks revision turnaround time.

### Vendor Payouts
- Freelance experts have profiles detailing skills, hourly/project rates, and verification status.
- Once a deliverable is approved, a vendor payout record is generated in `PENDING` status.
- Finance managers review and update payouts to `APPROVED` and subsequently `RELEASED` upon bank transfer or UPI execution.

---

## 4. Admin Control Panel

### Service Catalogue & Dynamic Pricing
- **Service Items**: Add or edit core offerings, turnaround times, and base pricing across domains (Web Dev, Branding, Legal, Tech Consulting).
- **Dynamic Pricing Rules**: Set up promotional or condition-based pricing:
  - *Surface-Specific Discounts*: e.g., 10% promotional discount for clients booking via `karyasaarthi.in`.
  - *Urgency Surcharges*: e.g., 25% expedited delivery fee for projects required under 48 hours.
  - *Volume Tiers*: e.g., progressive discounts for multi-month retainers.

### Feature Flags per Surface
- Enable or disable features without deploying code:
  - `ENABLE_LIVE_CHAT`: Controls whether the live chat widget renders on the specified surface.
  - `MAINTENANCE_MODE`: Safely redirects a specific surface during scheduled updates.
  - `AI_RESUME_SCORING`: Toggles Claude AI automated screening on the Career Portal.

---

## 5. Privacy & Data Protection (GDPR / DPDP)

The CRM is compliant with India's Digital Personal Data Protection (DPDP) Act and international data privacy regulations:
1. **Right to Data Portability (Data Export)**:
   - If a customer requests a copy of their stored data, navigate to their Person profile and click **"Export Data Dossier"**. A comprehensive JSON dossier will be downloaded containing all interactions, projects, invoices, and communication history.
2. **Right to be Forgotten (Data Erasure)**:
   - If a customer requests account deletion, click **"Erase Personal Data"**.
   - The CRM securely anonymizes names, emails, phone numbers, and redacts transactional messaging logs.
   - **Crucial Note**: Under accounting and tax laws, historical invoices (`Invoice` records) are legally required to be retained for statutory audits and will remain locked with an anonymized client label.
3. **Automated CV Retention**:
   - Applicant resumes and portfolios older than 180 days are automatically scrubbed by the system's scheduled retention engine to minimize data exposure.

