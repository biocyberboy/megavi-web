# 📘 Megavi Data Plan

## 1. Kiến trúc tổng quan
- Sử dụng Supabase (PostgreSQL + Auth) làm backend dữ liệu chính.
- Prisma ORM đặt trong app Next.js để truy cập Supabase thông qua `DATABASE_URL` (Postgres connection string).
- Phân quyền: Supabase Auth cho admin (email/password) với RLS bảo vệ bảng; service role key dùng cho API server-side.
- Migrations & seed thực hiện bằng Prisma Migrate + script seed kết hợp Supabase SQL (nếu cần extension).

## 2. Cấu trúc bảng

### 2.1 blog_posts
| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | `uuid` | PK, default `gen_random_uuid()` | Định danh bài viết |
| slug | `text` | Unique, not null | Slug URL thân thiện |
| title | `text` | Not null | Tiêu đề |
| summary | `text` | Not null | Tóm tắt ngắn |
| body_md | `text` | Not null | Nội dung Markdown |
| published_at | `timestamptz` | Nullable | Thời gian xuất bản |
| created_at | `timestamptz` | Default `now()` | Audit |
| updated_at | `timestamptz` | Default `now()` | Audit (trigger update) |

### 2.2 price_series
| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | `uuid` | PK, default `gen_random_uuid()` |
| code | `text` | Unique, not null | Mã series (ví dụ `ga-trang-mn`) |
| name | `text` | Not null | Tên hiển thị |
| unit | `text` | Not null | Đơn vị (đ/kg, VND/tấn...) |
| created_at | `timestamptz` | Default `now()` |
| updated_at | `timestamptz` | Default `now()` |

### 2.3 price_points
| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | `uuid` | PK, default `gen_random_uuid()` |
| series_id | `uuid` | FK -> price_series(id) cascade delete | Liên kết series |
| ts | `timestamptz` | Not null, index | Thời điểm giá |
| value | `numeric(12,2)` | Not null | Giá trị |
| source | `text` | Nullable | Ghi chú nguồn |
| created_at | `timestamptz` | Default `now()` |

- Index gợi ý: `idx_price_points_series_ts (series_id, ts DESC)` phục vụ truy vấn biểu đồ.

## 3. Prisma Schema
- Tạo `prisma/schema.prisma` kết nối đến Supabase.
- Định nghĩa model với mapping:
  ```prisma
  @@map("blog_posts")
  @@index([slug], name: "blog_posts_slug_key", unique: true)
  ```
- Sử dụng `@updatedAt` cho `updated_at`, `@default(now())`.
- `price_points` dùng `@relation(fields: [seriesId], references: [id], onDelete: Cascade)`.

## 4. Migration Strategy
1. Cài Prisma CLI, chạy `npx prisma migrate dev --name init`.
2. Chạy `npx prisma migrate deploy` trên môi trường Supabase production.
3. Nếu cần extension (vd. `pgcrypto` cho uuid): thêm migration SQL raw `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`.
4. Trigger cập nhật `updated_at`: tạo migration SQL với trigger `SET updated_at = now()` on update.

## 5. Seed Dữ liệu mẫu
- Script seed `prisma/seed.ts` chạy với `ts-node`.
- Tạo 3 bài viết demo với slug khớp giao diện hiện tại.
- Tạo 3 series (`vit-mb`, `ga-trang-mn`, `ga-ta-mb`), mỗi series insert ~30 điểm giá trong 30 ngày.
- Sử dụng `PrismaClient` `createMany` để tối ưu.
- Môi trường Supabase local: `pnpm prisma db seed`.

## 6. API Layer (Next.js Route Handlers)

### 6.1 GET /api/blog
- Server component route, truy vấn `blog_posts` có `published_at <= now()` (lọc drafts).
- Trả JSON: `[ { id, slug, title, summary, published_at } ]`.
- Thêm query `limit`, `page` nếu cần phân trang.
- Cache-control: `revalidate: 3600` (static) hoặc `NextResponse.json` với header `Cache-Control`.

### 6.2 GET /api/blog/[slug]
- Tìm bài theo `slug`.
- Trả `{ id, slug, title, summary, body_md, published_at }`.
- 404 nếu không tìm thấy.
- Áp dụng `draft` guard (khi `published_at` null → 404 trừ khi admin).

### 6.3 GET /api/price/series
- Truy vấn bảng `price_series`.
- Trả `[ { id, code, name, unit } ]`.
- Có thể thêm query `active=true` trong tương lai.

### 6.4 GET /api/price/[code]
- Tìm series theo `code`.
- Nhận query `range` (ngày) & `limit`.
- Truy vấn `price_points` với `series_id`, ORDER BY `ts DESC`, LIMIT theo range.
- Trả `{ series: { code, name, unit }, points: [{ ts, value, source }] }`.

### 6.5 Patterns chung
- Sử dụng Prisma `findMany`/`findFirst`.
- Handle lỗi bằng `try/catch` → `NextResponse.json({ error }, { status: 500 })`.
- Consider caching (Next.js `revalidateTag` hoặc `unstable_cache`) với tag `prices:code`.

## 7. Supabase Auth cho /admin
- Thiết lập Supabase Auth email/password.
- Tạo `admin` role: bảng `profiles` liên kết `auth.users`.
- Bật RLS:
  - `blog_posts`, `price_series`, `price_points`: chính sách `SELECT` cho `anon` (READ ONLY public).
  - `INSERT/UPDATE/DELETE` chỉ cho `authenticated` với `role = 'admin'`.
- Next.js `/admin` sử dụng Supabase Auth Helpers (`@supabase/auth-helpers-nextjs`) cho client/server session.
- Server route `/admin/*` kiểm tra session (middleware) và redirect nếu chưa đăng nhập.
- Supabase service role key sử dụng trong API server-side (Edge function optional).

## 8. DevOps & Config
- `.env`:
  - `DATABASE_URL` (service role for Prisma migrations).
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Pipeline:
  1. `pnpm prisma migrate deploy`.
  2. `pnpm prisma db seed` (chỉ môi trường staging/dev).
- Backup: cấu hình Supabase PITR hoặc schedule `pg_dump`.
- Monitoring: Sử dụng Supabase dashboard + logs Next.js (`/admin` hiển thị cảnh báo).

## 9. Các bước tiếp theo
1. Chuẩn hóa `.env` và kết nối Supabase project.
2. Viết Prisma schema & migration đầu tiên.
3. Đặt seed script, test với Supabase local (`supabase start`).
4. Tích hợp API routes, cập nhật frontend dùng dữ liệu thật.
5. Bảo mật `/admin`, thêm UI CRUD blog/series/points.
6. Tài liệu hóa quy trình deploy, backup và phân quyền nội bộ.
