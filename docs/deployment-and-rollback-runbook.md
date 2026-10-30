# Production Deployment & Rollback Runbook

This document outlines the standard operating procedures for deploying, monitoring, scaling, and rolling back the Karya Saarthi Unified CRM backend in production environments.

---

## 1. Pre-Deployment Readiness Checklist

Before triggering a production build or deploy, verify:
- [ ] All unit and integration test suites pass (`npm run test` or `npx ts-node scripts/test-golive-master-e2e.ts`).
- [ ] TypeScript compilation succeeds with zero errors (`npm run build`).
- [ ] Database migrations are backwards-compatible (`npx prisma migrate status`).
- [ ] All required production environment variables are configured in secret stores.
- [ ] Deep health check endpoint (`/health`) returns status `HEALTHY` and acceptable DB latency (<150ms on pooled connection).

---

## 2. Environment Variables Configuration

| Variable | Required | Description | Example / Recommendation |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | Runtime environment | `production` |
| `PORT` | Yes | HTTP server listener port | `3000` |
| `DATABASE_URL` | Yes | Neon pooled database connection string | `postgresql://user:pass@ep-xxx-pooler.neon.tech/neondb?sslmode=require&connect_timeout=30` |
| `DIRECT_URL` | Yes | Neon direct compute connection (for migrations) | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require&connect_timeout=30` |
| `JWT_SECRET` | Yes | 64+ char cryptographically random secret | Set via Vault / Cloud Secrets |
| `JWT_EXPIRES_IN` | Yes | Access token lifespan | `7d` or `24h` |
| `ANTHROPIC_API_KEY` | Optional | Claude AI evaluation and smart replies | `sk-ant-...` |
| `RAZORPAY_KEY_ID` | Optional | Payment gateway public key | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Optional | Payment gateway secret key | Live secret key |
| `CORS_ORIGIN` | Yes | Allowed origins comma-separated | `https://karyasaarthi.com,https://karyasaarthi.in,https://career.karyasaarthi.com` |

> [!IMPORTANT]
> **Neon Connection Pooling Note:** Always use `ep-...-pooler.neon.tech` for `DATABASE_URL` with `connect_timeout=30`. Do not include `channel_binding=require` with PgBouncer poolers. Use `DIRECT_URL` exclusively for schema migrations.

---

## 3. Zero-Downtime Deployment Procedure

### Step 1: Database Migration
```bash
# Execute migrations using the direct database connection
npx prisma migrate deploy
```

### Step 2: Build Container / Distribution
```bash
# Clean install production dependencies and compile TypeScript
npm ci
npm run build
```

### Step 3: Rolling Deployment (Canary or Blue/Green)
1. Start new instances with the updated artifact (`node dist/main`).
2. Traffic balancer probes `/health` endpoint on new instances until DB connectivity, memory footprint, and latency confirm readiness.
3. Shift 10% traffic to canary instances; monitor error rates on Sentry and CloudWatch.
4. If error rate is < 0.01% over 5 minutes, shift 100% traffic to the new version and retire previous instances.

---

## 4. Post-Deployment Verification & Drills

1. **Health Verification**:
   ```bash
   curl -s -f https://api.karyasaarthi.com/health | jq .
   ```
   Ensure `status` is `"HEALTHY"` and `database.status` is `"connected"`.
2. **Database Backup Consistency Drill**:
   Execute the automated consistency drill to confirm read/write consistency post-deploy:
   ```bash
   curl -X POST https://api.karyasaarthi.com/admin/backup-drill \
        -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
   ```
   Confirm response returns `status: "VERIFIED_SUCCESSFUL"`.

---

## 5. Rollback Procedures

If critical defects, data corruption, or severe performance degradation occur post-release:

### Scenario A: Application-Level Regression (Code Issue, No Breaking DB Migration)
1. **Trigger Rollback**: In CI/CD or platform orchestrator (Docker/Kubernetes/Render/Railway), immediately roll back deployment to the previous stable release tag:
   ```bash
   # Re-route traffic to previous commit image
   git checkout <PREVIOUS_STABLE_COMMIT>
   npm run build
   # Restart application processes
   ```
2. **Flush Connection Pool**: Restart backend workers to clear stale connection pools.
3. **Verify Health**: Hit `/health` to confirm normal operational latency.

### Scenario B: Database Migration Incompatibility
If an applied migration cannot support the previous application version:
1. Identify the rolled migration from `prisma/migrations`.
2. Check if down-migration scripts are provided in the release bundle.
3. If necessary, restore the database from the pre-deployment snapshot taken prior to migration execution:
   ```bash
   # In Neon Console:
   # Navigate to Branches -> Restore Point-In-Time to timestamp right before deployment
   ```
4. Point `DATABASE_URL` and `DIRECT_URL` to the restored point-in-time branch and restart workers.

