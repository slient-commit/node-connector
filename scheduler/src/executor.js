const cron = require("node-cron");
const logger = require("./logger");

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "default_internal_key";

// Map of sheetUid -> { task, schedule }
const activeCronJobs = new Map();

async function getSheets() {
  const res = await fetch(`${API_BASE_URL}/sheet/list-internal`, {
    headers: { "X-Internal-Key": INTERNAL_API_KEY },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheets: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function executeSheet(sheetUid) {
  const res = await fetch(`${API_BASE_URL}/sheet/execute-batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": INTERNAL_API_KEY,
    },
    body: JSON.stringify({ sheetUid, triggerType: "cron" }),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to execute sheet ${sheetUid}: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

function scheduleSheet(sheet) {
  const schedule = sheet.cron_schedule || "0 * * * *";

  if (!cron.validate(schedule)) {
    logger.error(`Invalid cron schedule for sheet "${sheet.name}": ${schedule}`);
    return;
  }

  const task = cron.schedule(schedule, async () => {
    logger.info(`Cron triggered for sheet: ${sheet.name} (${sheet.uid})`);
    try {
      const result = await executeSheet(sheet.uid);
      const summary = result.results
        .map((r) => `  [${r.rootNodeTitle}] ${r.status}`)
        .join("\n");
      logger.info(`Sheet "${sheet.name}" completed:\n${summary}`);
    } catch (err) {
      logger.error(`Sheet "${sheet.name}" failed: ${err.message}`);
    }
  });

  activeCronJobs.set(sheet.uid, { task, schedule });
  logger.info(`Scheduled sheet "${sheet.name}" with cron: ${schedule}`);
}

async function syncCronJobs() {
  try {
    const allSheets = await getSheets();
    const cronSheets = allSheets.filter(
      (s) => s.is_active === 1 && s.trigger_type === "cron"
    );

    const activeUids = new Set(cronSheets.map((s) => s.uid));

    // Remove jobs for sheets that are no longer active/cron
    for (const [uid, job] of activeCronJobs) {
      if (!activeUids.has(uid)) {
        job.task.stop();
        activeCronJobs.delete(uid);
        logger.info(`Removed cron job for sheet: ${uid}`);
      }
    }

    // Add or update jobs
    for (const sheet of cronSheets) {
      const existing = activeCronJobs.get(sheet.uid);
      if (!existing) {
        // New sheet - schedule it
        scheduleSheet(sheet);
      } else if (existing.schedule !== (sheet.cron_schedule || "0 * * * *")) {
        // Schedule changed - stop old, start new
        existing.task.stop();
        activeCronJobs.delete(sheet.uid);
        scheduleSheet(sheet);
        logger.info(`Updated cron schedule for sheet "${sheet.name}"`);
      }
    }

    logger.info(`Sync complete: ${activeCronJobs.size} active cron job(s)`);
  } catch (err) {
    logger.error(`Failed to sync cron jobs: ${err.message}`);
  }
}

module.exports = { syncCronJobs };
