# GitHub Workflows

Thư mục này chứa GitHub Actions workflow templates cho E2E testing.

## 📁 Available Workflows

### 1. `smoke-tests.yml.example` ⚡ (RECOMMENDED)
**Quick smoke tests (2-3 phút)**

- Chạy critical path tests
- Chỉ test trên Chromium
- Perfect cho PR checks
- Low CI/CD cost

**Setup**:
```bash
cp .github/workflows/smoke-tests.yml.example .github/workflows/smoke-tests.yml
git add .github/workflows/smoke-tests.yml
git commit -m "ci: Add smoke tests"
git push
```

### 2. `nightly-e2e.yml.example` 🌙
**Full test suite chạy nightly**

- Chạy mỗi đêm lúc 2 AM UTC
- Test against production URL
- Detect regressions
- Không block deploys

**Setup**:
```bash
cp .github/workflows/nightly-e2e.yml.example .github/workflows/nightly-e2e.yml
# Edit PLAYWRIGHT_BASE_URL nếu cần
git add .github/workflows/nightly-e2e.yml
git commit -m "ci: Add nightly E2E tests"
git push
```

### 3. `e2e.yml.example` 🔬
**Full E2E test suite**

- Chạy tất cả tests (15-20 phút)
- Multiple browsers
- Manual trigger by default
- Use for pre-release testing

**Setup**:
```bash
cp .github/workflows/e2e.yml.example .github/workflows/e2e.yml
# Uncomment triggers nếu muốn auto-run
git add .github/workflows/e2e.yml
git commit -m "ci: Add full E2E suite"
git push
```

## 🎯 Which One to Use?

### For Most Projects (RECOMMENDED)
```
✅ smoke-tests.yml - On every push
✅ nightly-e2e.yml - Every night
```

### For Critical Apps
```
✅ smoke-tests.yml - On PR
✅ e2e.yml - Before merge to main
✅ nightly-e2e.yml - Every night
```

### For MVP/Small Teams
```
✅ nightly-e2e.yml - Monitoring only
(Run tests manually before deploy)
```

## 🔐 Required Secrets

Add these to GitHub repository secrets (Settings → Secrets → Actions):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
DIRECT_URL
```

**Optional** (for notifications):
```
SLACK_WEBHOOK  # For Slack notifications
```

## 📊 Cost Estimate

### Public Repository
- ✅ **FREE** - Unlimited GitHub Actions minutes

### Private Repository
- Free tier: 2000 minutes/month
- Smoke tests: ~3 min/run
- Nightly full: ~20 min/run
- **Estimate**: ~30 runs/day smoke + 1 nightly = ~150 min/day = ~4500 min/month
- **Cost**: ~$20/month over free tier

### Optimization Tips
- Use `chromium` only for smoke tests
- Use `--project=chromium` flag
- Cache dependencies
- Run full suite only on schedule

## 🚀 Quick Start

**Minimum recommended setup (5 minutes)**:

```bash
# 1. Copy smoke tests workflow
cp .github/workflows/smoke-tests.yml.example .github/workflows/smoke-tests.yml

# 2. Add secrets to GitHub (go to Settings → Secrets)
# Add all environment variables

# 3. Commit and push
git add .github/workflows/smoke-tests.yml
git commit -m "ci: Enable smoke tests"
git push

# 4. Check Actions tab on GitHub to see it run
```

## 📚 More Info

See `docs/E2E_DEPLOYMENT_STRATEGY.md` for detailed deployment strategies and best practices.
