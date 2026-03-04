function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

module.exports = {
  info: (msg) => log("info", msg),
  error: (msg) => log("error", msg),
  debug: (msg) => {
    if (process.env.LOG_LEVEL === "debug") log("debug", msg);
  },
};
