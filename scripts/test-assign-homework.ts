import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const API = 'http://localhost:3001/api/v1';
const TEACHER_EMAIL = 'demo1.teacher@educationcenter.com';
const TEACHER_PASSWORD = 'demo1123';

type ApiResponse<T> = { data: T; error?: { message: string } };

async function api<T>(
  method: string,
  urlPath: string,
  token: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok) {
    throw new Error(json.error?.message || res.statusText);
  }
  return json.data;
}

function ensureFixture(): string {
  const docPath = path.join(process.cwd(), 'scripts', 'fixtures', 'demo-homework.docx');
  if (!fs.existsSync(docPath)) {
    execSync('npx ts-node --transpile-only scripts/create-demo-docx.ts', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  }
  return docPath;
}

async function main() {
  const login = await api<{ accessToken: string }>('POST', '/auth/login', '', {
    email: TEACHER_EMAIL,
    password: TEACHER_PASSWORD,
  });
  const token = login.accessToken;

  const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;
  const schedule = await api<{
    sessions: Array<{
      id: string;
      classId: string;
      className: string;
      sessionDate: string;
    }>;
  }>('GET', `/teacher-portal/schedule?monthStart=${monthStart}`, token);

  if (!schedule.sessions.length) {
    console.error('No sessions found for demo1 teacher. Create a session first.');
    process.exit(1);
  }

  const session = schedule.sessions[0];
  console.log('Using session:', session.className, session.sessionDate, session.id);

  const docPath = ensureFixture();
  const buffer = fs.readFileSync(docPath);
  const form = new FormData();
  form.append(
    'file',
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    'demo-homework.docx'
  );

  const uploadRes = await fetch(`${API}/uploads/homework`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const uploadJson = (await uploadRes.json()) as ApiResponse<{
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    driveFileId: string;
  }>;
  if (!uploadRes.ok) {
    throw new Error(uploadJson.error?.message || uploadRes.statusText);
  }
  const uploaded = uploadJson.data;
  console.log('Uploaded to Drive:', uploaded.url);

  await api('POST', `/sessions/${session.id}/materials`, token, {
    fileUrl: uploaded.url,
    fileName: uploaded.fileName,
    fileType: uploaded.fileType,
    fileSize: uploaded.fileSize,
    driveFileId: uploaded.driveFileId,
  });

  const homeworkText = 'Bài tập tuần này: đọc unit 3 và làm bài tập trang 12.';
  const content = `${homeworkText}\nTệp đính kèm: ${uploaded.url}`;

  await api('PUT', `/sessions/${session.id}`, token, { notes: content });

  const students = await api<Array<{ id: string; fullName: string }>>(
    'GET',
    `/classes/${session.classId}/students`,
    token
  );

  await api('POST', '/evaluations/bulk', token, {
    classId: session.classId,
    evaluationType: 'daily',
    evaluationDate: session.sessionDate,
    records: students.map((s) => ({
      studentId: s.id,
      comments: content,
    })),
  });

  console.log('Homework assigned to', students.length, 'students');
  console.log('Drive link:', uploaded.url);
}

main().catch((e: unknown) => {
  const err = e as { message?: string; cause?: { message?: string } };
  console.error('FAILED:', err.cause?.message || err.message || e);
  process.exit(1);
});
