const SQLiteManager = require("../sqlite-manager");

const VALID_EVENTS = [
  "login_success",
  "login_failure",
  "register",
  "logout",
  "password_change",
  "token_refresh",
  "sheet_create",
  "sheet_update",
  "sheet_delete",
  "sheet_settings_update",
  "sheet_execute",
  "webhook_trigger",
];

class AuditLog {
  static async createTable() {
    await new SQLiteManager().createTable("audit_log", [
      { name: "timestamp", type: "TEXT NOT NULL" },
      { name: "event", type: "TEXT NOT NULL" },
      { name: "user_id", type: "INTEGER" },
      { name: "username", type: "TEXT" },
      { name: "ip", type: "TEXT" },
      { name: "details", type: "TEXT" },
    ]);
  }

  static async log({ event, userId = null, username = null, ip = null, details = null }) {
    if (!VALID_EVENTS.includes(event)) {
      console.error(`AuditLog: unknown event "${event}"`);
      return;
    }
    try {
      await new SQLiteManager().insert("audit_log", [
        { name: "timestamp", value: new Date().toISOString() },
        { name: "event", value: event },
        { name: "user_id", value: userId },
        { name: "username", value: username },
        { name: "ip", value: ip },
        { name: "details", value: typeof details === "string" ? details : JSON.stringify(details) },
      ]);
    } catch (err) {
      console.error("AuditLog write error:", err.message);
    }
  }

  static async getRecent() {
    return await new SQLiteManager().select("audit_log");
  }
}

module.exports = AuditLog;
