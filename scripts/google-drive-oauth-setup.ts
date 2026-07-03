import 'dotenv/config';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { URL } from 'url';
import { google } from 'googleapis';

const REDIRECT_URI = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3333/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getProjectId(): string | undefined {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (json?.startsWith('{')) {
    return (JSON.parse(json) as { project_id?: string }).project_id;
  }
  const keyPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || 'secrets/google-service-account.json';
  const resolved = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
  if (!fs.existsSync(resolved)) return undefined;
  return (JSON.parse(fs.readFileSync(resolved, 'utf8')) as { project_id?: string }).project_id;
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd);
}

async function main() {
  let clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
  let clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    const projectId = getProjectId() || 'single-outrider-499916-b6';
    const consoleUrl = `https://console.cloud.google.com/apis/credentials/oauthclient?project=${projectId}`;

    console.log('Chưa có OAuth client. Làm nhanh 3 bước:\n');
    console.log('1. Mở GCP Credentials (trình duyệt sẽ tự mở):');
    console.log('   ', consoleUrl);
    console.log('2. Create Credentials → OAuth client ID → Web application');
    console.log('   Authorized redirect URI:', REDIRECT_URI);
    console.log('3. Copy Client ID + Client Secret vào .env:\n');
    console.log('   GOOGLE_DRIVE_CLIENT_ID=...');
    console.log('   GOOGLE_DRIVE_CLIENT_SECRET=...\n');
    console.log('Sau đó chạy lại: npm run setup:google-drive-oauth\n');

    openBrowser(consoleUrl);
    process.exit(1);
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('Đăng nhập Google account sở hữu folder Homework:\n');
  console.log(authUrl);
  console.log('');
  openBrowser(authUrl);

  const code = await waitForAuthCode();
  const { tokens } = await oauth2.getToken(code);

  if (!tokens.refresh_token) {
    console.error('Không nhận được refresh token. Vào https://myaccount.google.com/permissions , gỡ app, chạy lại.');
    process.exit(1);
  }

  console.log('\nThêm vào .env:\n');
  console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log(`GOOGLE_DRIVE_REDIRECT_URI=${REDIRECT_URI}`);
  console.log('\nRồi chạy: npm run verify:google-drive');
}

function waitForAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url || '/', REDIRECT_URI);
        if (url.pathname !== '/oauth2callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        if (error || !code) {
          res.writeHead(400);
          res.end('Authorization failed. You can close this tab.');
          reject(new Error(error || 'Missing authorization code'));
          server.close();
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Google Drive connected</h1><p>Quay lại terminal.</p>');
        resolve(code);
        server.close();
      } catch (err) {
        reject(err);
        server.close();
      }
    });

    server.listen(3333, () => {
      console.log('Đang chờ xác thực tại', REDIRECT_URI, '...\n');
    });

    server.on('error', reject);
  });
}

main().catch((e) => {
  console.error('FAILED:', e.message || e);
  process.exit(1);
});
