import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupDir = path.join(__dirname, '../backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `pos-backup-${timestamp}.gz`);

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const mongodump = `mongodump --uri="mongodb://localhost:27017/pos-system" --archive="${backupFile}" --gzip`;

exec(mongodump, (error, stdout, stderr) => {
  if (error) {
    console.error(`Backup failed: ${error}`);
    return;
  }
  console.log(`Database backed up to: ${backupFile}`);
  
  // Delete backups older than 30 days
  const files = fs.readdirSync(backupDir);
  const now = Date.now();
  files.forEach(file => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    const daysOld = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
    if (daysOld > 30) {
      fs.unlinkSync(filePath);
      console.log(`Deleted old backup: ${file}`);
    }
  });
});