/**
 * Xóa tài liệu bài tập cũ hơn HOMEWORK_RETENTION_DAYS (mặc định 30 ngày).
 * Chạy thủ công hoặc lên lịch (Render Cron / Task Scheduler).
 *
 *   npx ts-node --transpile-only scripts/cleanup-homework-files.ts
 */
import 'dotenv/config';
import { cleanupOldHomeworkMaterials, getHomeworkRetentionDays } from '../src/shared/services/homework-cleanup.service';
import { disconnectDatabase } from '../src/config/database';

async function main() {
  const retentionDays = getHomeworkRetentionDays();
  console.log(`Cleaning homework materials older than ${retentionDays} days...`);

  let totalDeleted = 0;
  let totalDrive = 0;
  let rounds = 0;

  // Loop until no more rows in batch (large backlogs)
  for (;;) {
    const result = await cleanupOldHomeworkMaterials({ retentionDays, batchSize: 200 });
    rounds++;
    totalDeleted += result.deleted;
    totalDrive += result.driveDeleted;
    if (result.scanned === 0) break;
    if (rounds > 50) {
      console.warn('Stopped after 50 batches — run again if needed.');
      break;
    }
  }

  console.log(JSON.stringify({ retentionDays, totalDeleted, totalDrive, rounds }, null, 2));
}

main()
  .catch((e) => {
    console.error('Cleanup failed:', e);
    process.exit(1);
  })
  .finally(() => disconnectDatabase());
