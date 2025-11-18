# 🧪 Tài liệu bàn giao automation test (Playwright)

Tài liệu này giúp đội manual test tiếp quản hoàn toàn mảng test tự động sau khi automation tester nghỉ việc. Nội dung tập trung vào cách vận hành, xử lý lỗi và bảo trì nhẹ các bài test Playwright hiện có.

---

## 1. Mục tiêu & phạm vi
- Giữ nguyên chất lượng kiểm thử tự động cho Megavi Web (Next.js 16 + Supabase/Prisma).
- Bảo đảm manual tester có thể: (1) chuẩn bị môi trường, (2) chạy từng nhóm test, (3) đọc báo cáo, (4) xử lý các lỗi phổ biến, (5) yêu cầu hỗ trợ đúng cách khi cần cập nhật code.
- Phạm vi: toàn bộ thư mục `e2e/`, cấu hình Playwright (`playwright.config.ts`) và các script trong `package.json`.

---

## 2. Công nghệ & cấu trúc chính

### Stack cốt lõi
- **Test runner:** Playwright 1.56 (`@playwright/test`).
- **Ngôn ngữ:** TypeScript, tuân thủ Page Object Model (POM).
- **Ứng dụng đích:** Next.js 16 (App Router) với Supabase/Postgres.

### Thư mục/ tập tin quan trọng
| Đường dẫn | Vai trò |
| --- | --- |
| `e2e/pages/*.ts` | Page Object cho từng màn hình chính (Home, Price, Blog, Admin...). |
| `e2e/fixtures/pages.ts` | Đăng ký fixtures để inject POM vào tests. |
| `e2e/utils/helpers.ts` | Hàm hỗ trợ (performance metrics, tiện ích chung). |
| `e2e/*.spec.ts` | Từng suite kiểm thử (xem bảng chi tiết ở mục 5). |
| `playwright.config.ts` | Cấu hình global: `baseURL`, danh sách projects (Desktop & Mobile), reporter HTML, web server tự động (`pnpm dev`). |
| `test-results/` | Ảnh, video, trace của lần chạy cuối. |
| `playwright-report/` | Báo cáo HTML (mở bằng `pnpm test:e2e:report`). |

---

## 3. Chuẩn bị môi trường
1. **Yêu cầu phần mềm**
   - Node.js 18+, pnpm 8+ (`corepack enable` nếu cần).
   - Trình duyệt/binary Playwright (`pnpm dlx playwright install --with-deps` chạy 1 lần sau khi cài đặt).
   - Quyền truy cập Supabase + biến môi trường chuẩn.

2. **Thiết lập repo**
   ```bash
   pnpm install
   cp .env.example .env.local   # cập nhật khoá Supabase/DB
   ```
   Bắt buộc set `ADMIN_PASSCODE` (dùng cho các test admin). Nếu chạy trên staging/production, override bằng biến môi trường tương ứng.

3. **Khởi chạy ứng dụng đích**
   - Local: `pnpm dev` (Playwright sẽ tự tái sử dụng server qua `webServer.reuseExistingServer`).
   - Hoặc trỏ tới môi trường từ xa bằng `PLAYWRIGHT_BASE_URL=https://staging.megavi.vn pnpm test:e2e ...`.

4. **Chuẩn bị dữ liệu**
   - Nếu cần seed giá/blog demo: chạy script seed Prisma (xem README) hoặc xác nhận với backend trước khi xoá/tạo dữ liệu thật.
   - Các test CRUD/functional **có thể ghi/xoá** dữ liệu thật => chỉ chạy trên môi trường sandbox/staging.

---

## 4. Quy trình chạy test chuẩn

| Tình huống | Lệnh chính | Dự kiến thời gian | Mục đích |
| --- | --- | --- | --- |
| Kiểm tra nhanh trước merge | `pnpm test:e2e smoke.spec.ts --project=chromium` | ~3 phút | Đảm bảo đường dẫn chính sống. |
| Regression quan trọng trước khi deploy | `pnpm test:e2e home.spec.ts price.spec.ts blog.spec.ts navigation.spec.ts` | 5-7 phút | Che đi homepage + price + blog + flow. |
| Toàn bộ suite Desktop | `pnpm test:e2e` | 15-20 phút | Run đầy đủ (Desktop + Mobile projects). |
| Soát thủ công | `pnpm test:e2e:ui` | Tuỳ | Debug tương tác (UI mode). |
| Điều tra lỗi | `pnpm test:e2e:debug <file>` | Tuỳ | Mở Playwright Inspector. |
| Xem báo cáo gần nhất | `pnpm test:e2e:report` | <1 phút | Mở `playwright-report/index.html`. |

> Mẹo: trên CI/chạy nhanh có thể giới hạn project: `pnpm test:e2e --project=chromium`.

---

## 5. Danh mục suites & coverage

| Spec | Phạm vi chính | Phụ thuộc/Ghi chú |
| --- | --- | --- |
| `smoke.spec.ts` | Kiểm tra tình trạng server, điều hướng cơ bản, lỗi JS. | Nên chạy mỗi khi chuẩn bị deploy. |
| `home.spec.ts` | Hero, CTA, latest posts, responsive cơ bản. | Không cần dữ liệu đặc biệt. |
| `price.spec.ts` | Trang `/gia`, filter sản phẩm/vùng/khoảng, chart & table, error handling. | Cần dữ liệu giá trong DB để có kết quả hiển thị. |
| `blog.spec.ts` | Listing blog, chi tiết bài viết, 404, navigation. | Dựa trên seed blog. |
| `navigation.spec.ts` | Navbar/footer link, multi-page journey, state giữ nguyên. | Chạy được với dữ liệu tối thiểu. |
| `api.spec.ts` | `/api/blog`, `/api/price/*`, lỗi 404/500. | Không cần UI; nên chạy ngay cả khi FE lỗi. |
| `performance.spec.ts` | Load time (5-10s), Core Web Vitals, memory leak, lazy-loading ảnh. | Nhạy cảm với máy yếu; nên chạy sau khi warm-up server. |
| `accessibility.spec.ts` | A11y violations, heading, alt text, keyboard nav. | Có thể tốn thời gian hơn do checks bổ sung. |
| `admin.spec.ts` | Render dashboard, các section quản trị, biểu mẫu. | Yêu cầu `ADMIN_PASSCODE`. Tương tác chỉ đọc. |
| `crud.spec.ts` | Read-only CRUD + một số thao tác tạo/xoá series/giá. | Cần admin passcode; test có thể chỉnh dữ liệu → dùng sandbox. |
| `functional-crud.spec.ts` | Kịch bản đầy đủ: tạo series, thêm giá, range price, xoá. | **Destructive** – chỉ chạy trên môi trường thử nghiệm. |
| `delete-price.spec.ts` | Xoá dòng giá mới nhất nhiều lần. | Chuẩn bị dữ liệu giả để tránh xoá dữ liệu thật. |
| `performance.spec.ts` | Đo thời gian & vitals (Desktop). | Có helper `checkPerformance`. |
| `example.spec.ts` | Mẫu tham khảo cho người mới. | Không dùng trong regression nhưng hữu ích để học cấu trúc. |

> Hướng dẫn chi tiết hơn: `e2e/README.md`, `e2e/QUICK_START.md`, `e2e/FUNCTIONAL_TESTS_README.md`.

---

## 6. Lịch chạy & trách nhiệm khuyến nghị
- **Trong ngày làm việc**: Dev tự chạy `smoke.spec.ts` trước khi mở PR; manual tester chạy lại nếu cần xác nhận lỗi.
- **Trước mỗi release**: Manual tester run combo `smoke + critical path (home, price, blog, navigation)` trên môi trường staging với dữ liệu mới nhất.
- **Cuối ngày (nếu có CI)**: Thiết lập job chạy `pnpm test:e2e` trên staging để phát hiện regression qua đêm. Nếu chưa có CI, manual tester nên chạy full suite ít nhất 2 lần/tuần.
- **Sau khi nhận task manual**: Ưu tiên dùng automation để verify nhanh (ví dụ test giá → chạy `price.spec.ts` trước rồi mới kiểm thủ công sâu).

---

## 7. Quy trình xử lý khi test fail
1. **Xác thực môi trường**
   - Server đang chạy? `pnpm dev` log có lỗi backend không?
   - Env đúng (đặc biệt `PLAYWRIGHT_BASE_URL`, `ADMIN_PASSCODE`)?
2. **Đọc log & báo cáo**
   - Chạy `pnpm test:e2e:report` → mở test fail → xem screenshot, trace.
   - Trace nằm trong `test-results/**/trace.zip` → `npx playwright show-trace trace.zip`.
3. **Phân loại lỗi**
   - **Do sản phẩm**: xác nhận bằng test thủ công → log bug, đính kèm trace/screenshot.
   - **Do test (flaky/selector)**: thử lại 1 lần (`pnpm test:e2e <file> --repeat-each=2`). Nếu chỉ fail 1 lần, ghi nhận là flaky và tạo issue "Flaky test".
   - **Do dữ liệu**: kiểm tra seed, Supabase, cron import.
4. **Hành động tiếp theo**
   - Với lỗi sản phẩm: mở ticket, attach log `playwright-report/` ZIP.
   - Với lỗi test: cập nhật selector nhỏ (nếu tự tin) hoặc gửi dev kèm phân tích. Tham khảo mục 8 để biết giới hạn chỉnh sửa của manual tester.

---

## 8. Bảo trì tối thiểu mà manual tester có thể làm
- **Cập nhật selector đơn giản**: nếu thay đổi `data-testid`/text nhỏ, chỉnh trong POM tương ứng (`e2e/pages/...`). Giữ nguyên pattern `locator('[data-testid="..."]')` nếu có.
- **Cập nhật cấu hình** (`playwright.config.ts`):
  - Thay `baseURL` khi môi trường mới.
  - Điều chỉnh `timeout`, `retries` (ví dụ staging chậm) – nhớ ghi chú lý do.
- **Bổ sung test nhẹ**:
  1. Tạo file mới hoặc thêm case trong spec hiện tại.
  2. Nếu cần page mới → tạo class trong `e2e/pages`, đăng ký fixture trong `e2e/fixtures/pages.ts`.
  3. Mọi thay đổi nên được code review bởi dev (dù manual tester viết).
- **Documentation**: cập nhật file này hoặc `docs/BUG_VS_TEST_ISSUES.md` khi phát hiện pattern fail mới.

---

## 9. Nguồn tham khảo nội bộ
- `README.md` → hướng dẫn chung dự án + scripts.
- `e2e/README.md` → mô tả chi tiết từng suite, cách viết test mới.
- `e2e/QUICK_START.md` → lệnh quan trọng + checklist trước deploy.
- `e2e/FUNCTIONAL_TESTS_README.md` → lưu ý riêng cho CRUD/Admin.
- `docs/E2E_DEPLOYMENT_STRATEGY.md` → gợi ý tích hợp CI/CD.

---

## 10. Checklist bàn giao nhanh
- [ ] Cài môi trường, chạy `pnpm test:e2e smoke.spec.ts` thành công trên máy của bạn.
- [ ] Biết cách đổi `PLAYWRIGHT_BASE_URL` để test trên staging/production.
- [ ] Có quyền truy cập seed/DB để reset dữ liệu thử nghiệm.
- [ ] Biết mở và export `playwright-report`.
- [ ] Hiểu suite nào **được phép** chạy trên môi trường thật (chỉ read-only) và suite nào chỉ dành cho sandbox.
- [ ] Đã bookmark tài liệu này + các link ở mục 9.

Sau khi hoàn tất các bước trên, manual tester có thể vận hành automation test mà không cần phụ thuộc vào automation engineer trước đây. Nếu phát sinh nhu cầu vượt quá phạm vi (ví dụ viết test lớn, refactor POM), hãy tạo ticket riêng để team dev hỗ trợ.
