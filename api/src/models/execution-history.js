const SQLiteManager = require("../sqlite-manager");

class ExecutionHistory {
  static async createTable() {
    await new SQLiteManager().createTable("execution_history", [
      { name: "sheet_uid", type: "TEXT NOT NULL" },
      { name: "sheet_name", type: "TEXT" },
      { name: "trigger_type", type: "TEXT NOT NULL" },
      { name: "status", type: "TEXT NOT NULL" },
      { name: "started_at", type: "TEXT NOT NULL" },
      { name: "duration_ms", type: "INTEGER" },
      { name: "node_count", type: "INTEGER" },
      { name: "error_count", type: "INTEGER" },
      { name: "results_summary", type: "TEXT" },
    ]);
  }

  static async record({ sheetUid, sheetName, triggerType, status, startedAt, durationMs, nodeCount, errorCount, resultsSummary }) {
    return await new SQLiteManager().insert("execution_history", [
      { name: "sheet_uid", value: sheetUid },
      { name: "sheet_name", value: sheetName },
      { name: "trigger_type", value: triggerType },
      { name: "status", value: status },
      { name: "started_at", value: startedAt },
      { name: "duration_ms", value: durationMs },
      { name: "node_count", value: nodeCount },
      { name: "error_count", value: errorCount },
      { name: "results_summary", value: JSON.stringify(resultsSummary) },
    ]);
  }

  static async getBySheetUid(sheetUid) {
    return await new SQLiteManager().selectAllBy(
      "execution_history",
      { name: "sheet_uid", value: sheetUid },
      "started_at DESC",
      50
    );
  }
}

module.exports = ExecutionHistory;
