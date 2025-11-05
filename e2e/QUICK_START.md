# 🚀 Quick Start Guide - MEGAVI E2E Tests

## Chạy Tests Nhanh

### 1. Smoke Tests (Recommended đầu tiên)
Kiểm tra nhanh app có hoạt động không:
```bash
pnpm test:e2e smoke.spec.ts
```
⏱️ **~2-3 phút**

### 2. Critical Path Tests
Test các tính năng chính:
```bash
pnpm test:e2e home.spec.ts price.spec.ts blog.spec.ts
```
⏱️ **~5-7 phút**

### 3. Full Test Suite
Chạy tất cả tests:
```bash
pnpm test:e2e
```
⏱️ **~15-20 phút** (tất cả browsers)

### 4. Development Mode (UI)
Mode tương tác tốt nhất để debug:
```bash
pnpm test:e2e:ui
```

## 📋 Checklist Trước Khi Deploy

- [ ] ✅ Smoke tests pass
- [ ] ✅ API tests pass  
- [ ] ✅ Homepage tests pass
- [ ] ✅ Price dashboard tests pass
- [ ] ✅ Blog tests pass
- [ ] ✅ No console errors
- [ ] ✅ Performance metrics acceptable

Nếu tất cả pass → **Safe to deploy** ✅

## 🎯 Test Files Chính

| File | Mục đích | Khi nào chạy |
|------|----------|--------------|
| `smoke.spec.ts` | Critical path | Mọi deploy |
| `home.spec.ts` | Homepage | Thay đổi UI homepage |
| `price.spec.ts` | Price dashboard | Thay đổi price logic |
| `blog.spec.ts` | Blog features | Thay đổi blog |
| `api.spec.ts` | Backend APIs | Thay đổi API |
| `navigation.spec.ts` | User flows | Thay đổi routing |
| `performance.spec.ts` | Speed checks | Before release |
| `accessibility.spec.ts` | A11y checks | Before release |

## 🔥 Common Commands

```bash
# Quick smoke test
pnpm test:e2e smoke.spec.ts --project=chromium

# Test specific feature
pnpm test:e2e home.spec.ts

# Debug mode
pnpm test:e2e:debug home.spec.ts

# Mobile testing
pnpm test:e2e --project="Mobile Chrome"

# View last report
pnpm test:e2e:report
```

## 🐛 Khi Tests Fail

1. **Xem report**:
   ```bash
   pnpm test:e2e:report
   ```

2. **Chạy lại với debug**:
   ```bash
   pnpm test:e2e:debug [test-file]
   ```

3. **Check screenshots**: Mở `test-results/` folder

4. **View trace**: Click vào failed test trong HTML report

## 📊 Coverage Summary

✅ **9 test suites** covering:
- Homepage (hero, CTAs, posts)
- Price Dashboard (charts, filters, data)
- Blog (listing, posts, navigation)
- Admin Panel (management features)
- API Endpoints (all routes)
- Navigation (user flows)
- Performance (load times, metrics)
- Accessibility (a11y standards)
- Smoke Tests (critical path)

✅ **Page Object Models** cho maintainability

✅ **100+ test cases** cho comprehensive coverage

## 💡 Tips

- **Chạy smoke tests trước** để catch major issues
- **Use UI mode** khi develop tests mới
- **Check performance tests** trước major releases
- **Run full suite** trước deploy production
- **Monitor test execution time** - optimize nếu > 20 phút

## 🆘 Need Help?

Xem `e2e/README.md` để biết chi tiết về:
- Test structure
- Writing new tests
- Debugging tips
- Best practices
