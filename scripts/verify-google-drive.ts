import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {
  getDriveAuthMode,
  isGoogleDriveConfigured,
  uploadHomeworkToDrive,
  deleteDriveFile,
} from '../src/shared/services/google-drive.service';

async function main() {
  console.log('=== Google Drive setup check ===\n');

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const authMode = getDriveAuthMode();

  console.log('GOOGLE_DRIVE_FOLDER_ID:', folderId || '(missing)');
  console.log('Auth mode:', authMode);
  console.log('HOMEWORK_RETENTION_DAYS:', process.env.HOMEWORK_RETENTION_DAYS || '30 (default)');
  console.log('Configured:', isGoogleDriveConfigured() ? 'YES' : 'NO');

  if (authMode === 'oauth') {
    console.log('OAuth client:', process.env.GOOGLE_DRIVE_CLIENT_ID ? 'set' : 'missing');
    console.log('Refresh token:', process.env.GOOGLE_DRIVE_REFRESH_TOKEN ? 'set' : 'missing');
  } else {
    const keyPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS || 'secrets/google-service-account.json';
    const resolvedKey = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
    console.log('Service account key:', resolvedKey, fs.existsSync(resolvedKey) ? 'found' : 'missing');
    console.log('Shared drive mode:', process.env.GOOGLE_DRIVE_USE_SHARED_DRIVE === 'true' ? 'YES' : 'NO');
    if (fs.existsSync(resolvedKey)) {
      const creds = JSON.parse(fs.readFileSync(resolvedKey, 'utf8')) as { client_email?: string };
      console.log('Service account email:', creds.client_email);
    }
  }

  console.log('');

  if (!isGoogleDriveConfigured()) {
    console.log('Fix (personal Gmail — recommended):');
    console.log('  1. GCP → Credentials → OAuth client ID (Web), redirect:', process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3333/oauth2callback');
    console.log('  2. Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in .env');
    console.log('  3. npm run setup:google-drive-oauth');
    console.log('');
    console.log('Fix (Google Workspace Shared Drive):');
    console.log('  1. Create a Shared Drive, add service account as Content manager');
    console.log('  2. Create Homework folder inside it, share folder ID in .env');
    console.log('  3. Set GOOGLE_DRIVE_USE_SHARED_DRIVE=true');
    process.exit(1);
  }

  const fixture = path.join(process.cwd(), 'scripts', 'fixtures', 'demo-homework.docx');
  if (!fs.existsSync(fixture)) {
    require('child_process').execSync('npx ts-node --transpile-only scripts/create-demo-docx.ts', {
      stdio: 'inherit',
    });
  }

  console.log('Testing upload + delete...');
  const buffer = fs.readFileSync(fixture);
  const uploaded = await uploadHomeworkToDrive(buffer, 'verify-drive-test.docx');
  console.log('Upload OK:', uploaded.url);
  await deleteDriveFile(uploaded.driveFileId);
  console.log('Delete OK');
  console.log('\nGoogle Drive is ready for homework uploads.');
}

main().catch((e) => {
  console.error('\nFAILED:', e.message || e);
  process.exit(1);
});
