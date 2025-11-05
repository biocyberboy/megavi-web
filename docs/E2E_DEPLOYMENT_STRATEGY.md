# 🚀 E2E Testing Deployment Strategy

## Câu Hỏi: E2E Tests Có Chạy Trên Production Deploy?

**TL;DR**: Không nên chạy full e2e suite mỗi production deploy. Đây là best practice thực tế.

---

## 📊 Industry Standard Practices

### Tier 1: Small/Medium Projects (Như MEGAVI)
```
Git Push → Vercel
  ↓
1. Install dependencies (pnpm install)
2. Build (pnpm build) ← Chỉ có bước này
3. Deploy
```

**E2E tests**: Chạy riêng, không block deploy

### Tier 2: Medium/Large Projects
```
Git Push → CI/CD Pipeline
  ↓
1. Lint & Type Check
2. Unit Tests (nhanh, < 1 min)
3. Build
4. Deploy to Staging
5. Smoke Tests on Staging (2-3 min) ← E2E nhẹ
6. Deploy to Production (nếu pass)
```

### Tier 3: Enterprise Projects
```
Git Push → Multi-Stage Pipeline
  ↓
1. Lint, Type Check, Unit Tests
2. Build
3. Deploy to Dev Environment
4. Full E2E Suite on Dev (15-20 min)
5. Deploy to Staging (if E2E pass)
6. Smoke Tests on Staging
7. Manual Approval Gate
8. Deploy to Production
9. Post-Deploy Smoke Tests (monitoring)
```

---

## 🎯 Recommended Strategy Cho MEGAVI

### Option 1: Minimal (Quick Deploy)
**Best cho MVP và rapid iteration**

```yaml
# Không có automated e2e trong deploy pipeline
# Chạy manually trước khi deploy

# Local:
pnpm test:e2e smoke.spec.ts  # Developer runs before push
git push                      # Auto-deploy to Vercel
```

**Pros**: 
- ✅ Deploy nhanh nhất
- ✅ Không cost CI/CD minutes
- ✅ Developer có control

**Cons**:
- ❌ Rely on developer discipline
- ❌ Không có automated safety net

---

### Option 2: Smoke Tests Only (Recommended)
**Best balance giữa speed và safety**

```yaml
# .github/workflows/deploy.yml
name: Deploy with Smoke Tests

on:
  push:
    branches: [main]

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm exec playwright install chromium --with-deps
      
      # Chỉ chạy smoke tests (2-3 phút)
      - run: pnpm test:e2e smoke.spec.ts --project=chromium
        env:
          PLAYWRIGHT_BASE_URL: https://megavi-web.vercel.app
      
  # Vercel deploy runs automatically on push
```

**Pros**:
- ✅ Nhanh (2-3 phút)
- ✅ Catch critical regressions
- ✅ Low CI/CD cost

**Cons**:
- ⚠️ Không test full features

---

### Option 3: Staged Deploy (Professional)
**Best cho production apps với users**

```yaml
# .github/workflows/staged-deploy.yml
name: Staged Deployment

on:
  push:
    branches: [main]

jobs:
  # Step 1: Lint & Type Check
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm tsc --noEmit

  # Step 2: Deploy to Staging (Vercel Preview)
  deploy-staging:
    needs: quality-check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          scope: ${{ secrets.TEAM_SLUG }}

  # Step 3: E2E Tests on Staging
  e2e-staging:
    needs: deploy-staging
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      
      # Run full suite against staging URL
      - run: pnpm test:e2e
        env:
          PLAYWRIGHT_BASE_URL: ${{ needs.deploy-staging.outputs.preview-url }}
      
      # Upload results
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  # Step 4: Deploy to Production (only if E2E pass)
  deploy-production:
    needs: e2e-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
```

**Pros**:
- ✅ Full E2E coverage
- ✅ Tests against real staging environment
- ✅ Blocks bad deploys
- ✅ Professional workflow

**Cons**:
- ❌ Slower (20-30 phút total)
- ❌ More complex setup
- ❌ Higher CI/CD cost

---

### Option 4: Nightly Full Suite
**Best cho background validation**

```yaml
# .github/workflows/nightly-e2e.yml
name: Nightly E2E Tests

on:
  schedule:
    # Run every night at 2 AM
    - cron: '0 2 * * *'
  workflow_dispatch: # Manual trigger

jobs:
  e2e-full:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      
      # Run against production
      - run: pnpm test:e2e
        env:
          PLAYWRIGHT_BASE_URL: https://megavi-web.vercel.app
      
      # Send notification if failed
      - uses: 8398a7/action-slack@v3
        if: failure()
        with:
          status: ${{ job.status }}
          text: 'Nightly E2E tests failed on production'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**Use case**:
- 🌙 Chạy nightly để detect regressions
- 📊 Monitor production health
- 🔔 Alert team nếu có issues

---

## 📈 Real World Examples

### Vercel (Platform Itself)
```
- Không chạy full e2e mỗi deploy
- Chạy smoke tests cho critical paths
- Full e2e suite chạy nightly
```

### GitHub
```
- Unit tests trong PR
- Integration tests sau merge
- E2E tests chạy scheduled (not blocking)
```

### Stripe
```
- Staged deploys
- Smoke tests on staging
- Full e2e suite chạy pre-release
- Canary deploys with monitoring
```

---

## 🎯 Recommendation Cho MEGAVI

### Phase 1: MVP (Hiện Tại)
```bash
# Manual workflow
1. Developer runs: pnpm test:e2e smoke.spec.ts
2. If pass: git push
3. Vercel auto-deploys
4. Manual verification trên production
```

### Phase 2: When You Have Users
```yaml
# Setup GitHub Actions
- Chạy smoke tests trước deploy (2-3 min)
- Block deploy nếu smoke tests fail
- Full e2e suite chạy nightly
```

### Phase 3: Scaling Up
```yaml
# Staged deployment
- Deploy to staging
- Run full e2e on staging
- Deploy to production if pass
- Post-deploy smoke tests
```

---

## 💰 Cost Analysis

### Vercel Hobby Plan
- ❌ Không support custom deploy workflows
- ✅ Free, deploy on push
- ⚠️ Phải dùng GitHub Actions riêng cho tests

### Vercel Pro Plan ($20/month)
- ✅ Support deploy protection
- ✅ Can block deploy nếu checks fail
- ✅ Integration với GitHub Actions

### GitHub Actions (Public Repo)
- ✅ Free unlimited minutes
- ✅ Perfect cho open source

### GitHub Actions (Private Repo)
- ⚠️ 2000 minutes/month free
- 💰 $0.008/minute sau đó
- Full e2e suite (20 min) = ~$0.16/run

---

## 🔧 Implementation Guide

### Quick Setup: Smoke Tests (15 minutes)

**Step 1**: Create `.github/workflows/smoke-tests.yml`
```yaml
name: Smoke Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - run: pnpm install
      - run: pnpm exec playwright install chromium --with-deps
      - run: pnpm test:e2e smoke.spec.ts --project=chromium
```

**Step 2**: Push to GitHub
```bash
git add .github/workflows/smoke-tests.yml
git commit -m "feat: Add smoke tests to CI"
git push
```

**Step 3**: Done! Tests chạy tự động mỗi push

---

## ✅ Checklist: Choose Your Strategy

### ☑️ Option 1: Manual Testing
- [ ] Best nếu: Team nhỏ, MVP stage
- [ ] Setup: Không cần
- [ ] Time: 0 (manual)

### ☑️ Option 2: Smoke Tests Only
- [ ] Best nếu: Production app, need safety net
- [ ] Setup: 15 minutes (GitHub Actions)
- [ ] Time: 2-3 phút per deploy
- [ ] Cost: Free (public) hoặc minimal

### ☑️ Option 3: Staged Deploy
- [ ] Best nếu: Critical app, nhiều users
- [ ] Setup: 1-2 hours (Vercel + GitHub)
- [ ] Time: 20-30 phút per deploy
- [ ] Cost: Moderate ($20/month Vercel Pro)

### ☑️ Option 4: Nightly Full Suite
- [ ] Best nếu: Supplementary to other options
- [ ] Setup: 15 minutes
- [ ] Time: Runs overnight
- [ ] Cost: Free

---

## 📋 Sample: Hybrid Approach (RECOMMENDED)

```yaml
# Fast feedback loop for developers
PR Push → Smoke Tests (2 min) → Merge

# Nightly monitoring
Every Night → Full E2E Suite (20 min) → Alert if fail

# Manual full test before major release
Before Release → pnpm test:e2e (20 min) → Deploy
```

**Benefits**:
- ✅ Fast iterations
- ✅ Safety net for critical paths
- ✅ Full coverage scheduled
- ✅ Low cost

---

## 🎓 Summary

| Strategy | Setup Time | Deploy Time | Cost | Best For |
|----------|-----------|-------------|------|----------|
| Manual | 0 | 0 | Free | MVP |
| Smoke Only | 15 min | +2-3 min | Free | Production |
| Staged Deploy | 2 hours | +20-30 min | $20/mo | Critical Apps |
| Nightly Full | 15 min | Overnight | Free | Monitoring |

**Recommendation cho MEGAVI**: Start với **Smoke Tests Only** + **Nightly Full Suite**

---

## 📞 Next Steps

### Immediate (5 minutes)
```bash
# Tạo workflow file
cp .github/workflows/e2e.yml.example .github/workflows/smoke-tests.yml

# Edit để chỉ chạy smoke tests
# Change: pnpm test:e2e → pnpm test:e2e smoke.spec.ts

# Commit và push
git add .github/workflows/smoke-tests.yml
git commit -m "feat: Add smoke tests CI"
git push
```

### This Week
- [ ] Setup GitHub Actions smoke tests
- [ ] Test workflow hoạt động
- [ ] Document cho team

### Next Month
- [ ] Review test results
- [ ] Add nightly full suite nếu cần
- [ ] Consider staged deploy nếu có nhiều users

---

**Conclusion**: E2E tests là safety net, KHÔNG phải blocking wall. Smart deployment strategy cân bằng giữa speed, safety, và cost.
