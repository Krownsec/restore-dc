const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './database/restore.db';
const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const CRON_SCHEDULE = process.env.BACKUP_CRON || '0 */6 * * *'; // every 6 hours by default

function runBackup() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('Backup skipped — database file does not exist yet.');
    return;
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(BACKUP_DIR, `restore-${timestamp}.db`);

  fs.copyFileSync(DB_PATH, dest);
  console.log(`Backup written to ${dest}`);

  // Keep only the 10 most recent backups to avoid unbounded disk growth
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  for (const file of files.slice(10)) {
    fs.unlinkSync(path.join(BACKUP_DIR, file.name));
  }
}

function startBackupSchedule() {
  cron.schedule(CRON_SCHEDULE, runBackup);
  console.log(`Automatic backups scheduled (${CRON_SCHEDULE}).`);
}

module.exports = { startBackupSchedule, runBackup };
