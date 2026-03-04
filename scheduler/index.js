require("dotenv").config();
const logger = require("./src/logger");
const { syncCronJobs } = require("./src/executor");

const SYNC_INTERVAL = 30; // seconds

logger.info("Scheduler starting...");

// Initial sync after a short delay (wait for API to be ready)
setTimeout(async () => {
  await syncCronJobs();

  // Re-sync periodically to pick up changes
  setInterval(async () => {
    await syncCronJobs();
  }, SYNC_INTERVAL * 1000);
}, 5000);

logger.info(`Scheduler is running. Syncing every ${SYNC_INTERVAL}s...`);
