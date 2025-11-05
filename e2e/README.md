# MEGAVI E2E Test Suite

Bộ test tự động hoàn chỉnh cho MEGAVI web application sử dụng Playwright.

## 📁 Cấu trúc thư mục

```
e2e/
├── pages/              # Page Object Models (POM)
│   ├── BasePage.ts     # Base class cho tất cả pages
│   ├── HomePage.ts     # Homepage (/)
│   ├── PricePage.ts    # Price dashboard (/gia)
│   ├── BlogPage.ts     # Blog listing (/blog)
│   ├── BlogPostPage.ts # Individual blog posts
│   └── AdminPage.ts    # Admin panel (/admin)
├── fixtures/           # Test fixtures và helpers
│   └── pages.ts        # Page fixtures cho dependency injection
├── utils/              # Utility functions
│   └── helpers.ts      # Common test helpers
├── *.spec.ts          # Test files
└── README.md          # Tài liệu này
```

## 🧪 Test Categories

### 1. **Smoke Tests** (`smoke.spec.ts`)
Test cơ bản nhất để đảm bảo app hoạt động:
- ✅ Tất cả pages accessible (status < 500)
- ✅ Không có JavaScript errors critical
- ✅ API endpoints responding
- ✅ Database connection working
- ✅ Load time < 3 seconds

**Chạy khi**: Trước mỗi deploy, sau mỗi build

```bash
pnpm test:e2e smoke.spec.ts
```

### 2. **Homepage Tests** (`home.spec.ts`)
Test trang chủ và hero section:
- Hero video background
- CTAs navigation (Giá, Blog)
- Latest posts display
- Responsive design
- Console errors

### 3. **Price Dashboard Tests** (`price.spec.ts`)
Test trang giá gia cầm:
- Page load và data display
- Product/Region/Range selectors
- Chart rendering
- API error handling
- Mobile responsiveness
- Data update on filter change

### 4. **Blog Tests** (`blog.spec.ts`)
Test blog listing và posts:
- Blog listing page
- Post cards display
- Navigation to individual posts
- Post content rendering
- 404 handling
- Complete navigation flow

### 5. **Admin Tests** (`admin.spec.ts`)
Test admin panel:
- Page load và authentication
- Stats dashboard
- Blog management section
- Series management section
- Forms presence

### 6. **API Tests** (`api.spec.ts`)
Test REST API endpoints:
- `/api/blog` - Blog listing
- `/api/blog/[slug]` - Individual post
- `/api/price/series` - Price series
- `/api/price/latest` - Latest prices
- `/api/prices/metadata` - Metadata
- Error handling (404, 500)

### 7. **Navigation Tests** (`navigation.spec.ts`)
Test site navigation và user flows:
- Navbar presence on all pages
- Footer links
- Complete user journey
- Navigation state maintenance
- Cross-page navigation

### 8. **Performance Tests** (`performance.spec.ts`)
Test hiệu suất:
- Page load times (< 5s homepage, < 10s price page)
- Core Web Vitals
- Image loading optimization
- Memory leak detection

### 9. **Accessibility Tests** (`accessibility.spec.ts`)
Test khả năng tiếp cận:
- No critical violations
- Heading hierarchy (H1)
- Keyboard navigation
- Form labels
- Image alt text
- Color contrast
- Tab order

## 🚀 Chạy Tests

### Tất cả tests
```bash
pnpm test:e2e
```

### Chạy specific test file
```bash
pnpm test:e2e smoke.spec.ts
pnpm test:e2e home.spec.ts
pnpm test:e2e price.spec.ts
```

### Chạy với UI mode (recommended for development)
```bash
pnpm test:e2e:ui
```

### Chạy với browser visible (headed mode)
```bash
pnpm test:e2e:headed
```

### Debug mode
```bash
pnpm test:e2e:debug
```

### Chỉ chạy specific browser
```bash
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

### Chỉ chạy mobile tests
```bash
pnpm test:e2e --project="Mobile Chrome"
pnpm test:e2e --project="Mobile Safari"
```

## 📊 Test Reports

Sau khi chạy tests, xem HTML report:
```bash
pnpm test:e2e:report
```

Report sẽ mở trong browser với:
- Pass/Fail summary
- Screenshots on failure
- Trace viewer
- Performance metrics

## ✅ Best Practices Được Áp Dụng

### 1. **Page Object Model (POM)**
- Tách logic UI thành các page classes
- Reusable và maintainable
- Clear separation of concerns

### 2. **Test Isolation**
- Mỗi test độc lập
- Không share state giữa tests
- Clean setup/teardown

### 3. **Fixtures Pattern**
- Dependency injection cho pages
- Consistent test structure
- Easy to extend

### 4. **Explicit Waits**
- `waitForLoadState('networkidle')`
- `expect().toBeVisible()` với timeout
- Không dùng `page.waitForTimeout()` trừ khi cần thiết

### 5. **Descriptive Test Names**
- Test names mô tả rõ ràng behavior
- Theo format: "should [expected behavior]"

### 6. **Error Handling**
- Graceful handling của missing elements
- Proper assertions với meaningful messages
- Screenshot on failure (automatic)

### 7. **Mobile-First Testing**
- Tests cho responsive design
- Multiple viewport sizes
- Touch interactions

## 🎯 Recommended Test Run Order

### Pre-Deploy (CI/CD Pipeline)
1. **Smoke tests** (2-3 phút) - Critical path
2. **API tests** (1-2 phút) - Backend health
3. **Navigation tests** (2-3 phút) - User flows

### Full Regression (Nightly/Weekly)
Run tất cả tests trên tất cả browsers (15-20 phút)

### Development
- Run specific test file đang làm việc
- Use UI mode để debug
- Focus on relevant tests

## 🔧 Configuration

Xem `playwright.config.ts` để customize:
- Browser options
- Timeout settings
- Screenshot/video recording
- Base URL
- Parallel execution

## 📝 Viết Tests Mới

### 1. Tạo Page Object (nếu cần)
```typescript
// e2e/pages/NewPage.ts
import { BasePage } from './BasePage';

export class NewPage extends BasePage {
  readonly element = this.page.locator('[data-testid="element"]');
  
  async goto() {
    await super.goto('/new-path');
  }
  
  async verifyLoaded() {
    await expect(this.element).toBeVisible();
  }
}
```

### 2. Thêm vào fixtures
```typescript
// e2e/fixtures/pages.ts
import { NewPage } from '../pages/NewPage';

type PageFixtures = {
  // ...existing
  newPage: NewPage;
};

export const test = base.extend<PageFixtures>({
  // ...existing
  newPage: async ({ page }, use) => {
    await use(new NewPage(page));
  },
});
```

### 3. Viết test
```typescript
// e2e/new-feature.spec.ts
import { test, expect } from './fixtures/pages';

test.describe('New Feature', () => {
  test('should work correctly', async ({ newPage }) => {
    await newPage.goto();
    await newPage.verifyLoaded();
  });
});
```

## 🐛 Debugging Tips

### 1. Use UI Mode
```bash
pnpm test:e2e:ui
```
- Step through tests
- Inspect DOM
- Time travel debugging

### 2. Use Debug Mode
```bash
pnpm test:e2e:debug
```
- Opens Playwright Inspector
- Set breakpoints
- Explore selectors

### 3. Add Debug Logs
```typescript
console.log(await page.content());
await page.pause(); // Pauses execution
```

### 4. View Trace
When test fails, trace file is saved. Open with:
```bash
npx playwright show-trace trace.zip
```

## 📈 Coverage Goals

- ✅ **Critical Path**: 100% (Smoke tests)
- ✅ **User Flows**: 90%+ (Homepage, Price, Blog)
- ✅ **API Endpoints**: 100%
- ✅ **Accessibility**: Basic checks on all pages
- ✅ **Performance**: Key metrics on main pages

## 🔄 Maintenance

### Regular Tasks
- [ ] Update selectors khi UI thay đổi
- [ ] Add tests cho features mới
- [ ] Remove obsolete tests
- [ ] Update base URL nếu deploy URL thay đổi
- [ ] Review failed tests và fix flakiness

### Quarterly Review
- [ ] Review test coverage
- [ ] Optimize slow tests
- [ ] Update Playwright version
- [ ] Review accessibility standards

## 🆘 Common Issues

### Test timeout
- Increase timeout trong playwright.config.ts
- Check network speed
- Verify dev server is running

### Element not found
- Check selector với Playwright Inspector
- Add proper waits
- Verify element exists trong page

### Flaky tests
- Add explicit waits
- Check for race conditions
- Use `waitForLoadState('networkidle')`

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Page Object Model](https://playwright.dev/docs/pom)
