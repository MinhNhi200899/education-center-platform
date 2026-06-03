# Education Center Management Platform

Hệ thống quản lý trung tâm giáo dục: điểm danh, phiếu thu, báo cáo, nhận xét, lịch dạy.

## Stack

- **Backend:** Node.js, Express, Prisma, PostgreSQL
- **Frontend:** React, Vite, Mantine
- **Deploy:** [Neon](https://neon.tech) + [Render](https://render.com) + [Vercel](https://vercel.com)

## Local dev

```bash
docker compose up -d postgres
cp .env.example .env
npm install
npx prisma db push
npx ts-node --transpile-only scripts/seed-dev.ts
npm run dev          # API :3001

cd frontend && npm install && npm run dev   # UI :3000
```

## Deploy

Xem [docs/DEPLOY.md](docs/DEPLOY.md).

## Demo login (sau seed)

| Role | Email | Password |
|------|--------|----------|
| Admin (teacher) | admin@educationcenter.com | admin123 |
| Student | student@educationcenter.com | student123 |
