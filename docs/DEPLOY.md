# Deploy: Neon + Render + Vercel

Kiến trúc:

| Thành phần | Nền tảng | Ghi chú |
|------------|----------|---------|
| PostgreSQL | **Neon** | `DATABASE_URL` cho Render |
| Backend API | **Render** | Express, port `10000` |
| Frontend | **Vercel** | Vite/React, gọi API Render qua `VITE_API_URL` |

---

## 1. Neon (database)

1. Tạo project tại [neon.tech](https://neon.tech).
2. Tạo database → copy **connection string** (dùng bản có **pooler** cho app).
3. Chuỗi dạng:

```text
postgresql://USER:PASSWORD@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

4. (Khuyến nghị) Bật **Connection pooling** → dùng host `-pooler` cho `DATABASE_URL` trên Render.

Lần đầu schema: chạy từ máy local (hoặc để Render build chạy `prisma db push`):

```bash
DATABASE_URL="postgresql://..." npx prisma db push
DATABASE_URL="postgresql://..." npx ts-node --transpile-only scripts/seed-dev.ts
```

---

## 2. Render (backend)

1. [dashboard.render.com](https://dashboard.render.com) → **New → Web Service**.
2. Connect repo GitHub `MinhNhi` (root repo, **không** chọn thư mục `frontend`).
3. Cấu hình:

| Field | Value |
|-------|--------|
| **Root Directory** | *(để trống — root repo)* |
| **Runtime** | Node |
| **Build Command** | `npm ci --include=dev && npm run build && npx prisma db push` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/v1/health` |

4. **Environment Variables** (Settings → Environment):

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=<chuỗi Neon, sslmode=require>
JWT_SECRET=<openssl rand -base64 48>
REFRESH_TOKEN_SECRET=<openssl rand -base64 48>
PASSWORD_RESET_SECRET=<openssl rand -base64 48>
SESSION_SECRET=<openssl rand -base64 48>
ENCRYPTION_KEY=<32 ký tự ngẫu nhiên>
CORS_ORIGINS=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app
```

Sau khi deploy Vercel, thêm đúng URL frontend (không dấu `/` cuối) vào **cả** `CORS_ORIGINS` và `FRONTEND_URL`.

5. Deploy → copy URL API, ví dụ: `https://ecmp-api.onrender.com`

6. Chạy seed (một lần) — Render Shell hoặc local:

```bash
DATABASE_URL=<neon> npx ts-node --transpile-only scripts/seed-dev.ts
```

**Lưu ý free tier:** service sleep sau ~15 phút không dùng; request đầu có thể chậm ~30s.

Hoặc import `render.yaml` (Blueprint) nếu repo đã push file này.

---

## 3. Vercel (frontend)

1. [vercel.com](https://vercel.com) → **Add New → Project** → import repo.
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite (tự nhận `vercel.json`).
4. **Environment Variables:**

```env
VITE_API_URL=https://ecmp-api.onrender.com/api/v1
```

Thay bằng URL Render thật của bạn, **có** `/api/v1`.

5. Deploy → URL dạng `https://xxx.vercel.app`

6. Quay lại **Render** → cập nhật `CORS_ORIGINS` = URL Vercel → **Manual Deploy** lại API nếu CORS chặn.

---

## 4. Kiểm tra sau deploy

1. `GET https://<render>/api/v1/health` → `{"status":"healthy",...}`
2. Mở Vercel → đăng nhập `admin@educationcenter.com` / `admin123` (sau seed).
3. DevTools → Network: request tới `onrender.com`, không 404/CORS.

---

## 5. Biến môi trường tóm tắt

### Render (backend)

| Biến | Bắt buộc |
|------|----------|
| `DATABASE_URL` | ✅ Neon |
| `JWT_SECRET` | ✅ |
| `REFRESH_TOKEN_SECRET` | ✅ |
| `CORS_ORIGINS` | ✅ URL Vercel |
| `PORT` | Render set `10000` |

### Vercel (frontend)

| Biến | Bắt buộc |
|------|----------|
| `VITE_API_URL` | ✅ `https://...onrender.com/api/v1` |

---

## 6. Redis / Docker local

Production trên Render **không bắt buộc Redis** (auth dùng JWT + DB). `docker-compose` chỉ cho dev local.

---

## Troubleshooting

| Lỗi | Cách xử lý |
|-----|------------|
| CORS | `CORS_ORIGINS` trùng origin Vercel (https, không slash cuối) |
| 502 / timeout Render | Free tier đang wake; đợi hoặc nâng plan |
| Prisma P1001 | Kiểm tra `DATABASE_URL`, `sslmode=require` |
| API 404 trên Vercel | Thiếu/sai `VITE_API_URL`; rebuild Vercel |
| `Route GET /teacher/schedule not found` | Đang mở **URL Render** thay vì **Vercel**; dùng `https://xxx.vercel.app/teacher/schedule`. Set `FRONTEND_URL` trên Render để tự redirect |
| Login 401 | Chạy `seed-dev.ts` trên DB Neon |
