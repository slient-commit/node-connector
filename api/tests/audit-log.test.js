const AuditLog = require("../src/models/audit-log");
const SQLiteManager = require("../src/sqlite-manager");

jest.mock("../src/sqlite-manager");

describe("AuditLog", () => {
  let mockInsert;
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInsert = jest.fn().mockResolvedValue(1);
    SQLiteManager.mockImplementation(() => ({
      insert: mockInsert,
      createTable: jest.fn().mockResolvedValue(true),
      select: jest.fn().mockResolvedValue([]),
    }));
    consoleSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test("log() inserts a valid event with all fields", async () => {
    await AuditLog.log({
      event: "login_success",
      userId: 1,
      username: "admin",
      ip: "127.0.0.1",
      details: "test login",
    });

    expect(mockInsert).toHaveBeenCalledWith("audit_log", [
      { name: "timestamp", value: expect.any(String) },
      { name: "event", value: "login_success" },
      { name: "user_id", value: 1 },
      { name: "username", value: "admin" },
      { name: "ip", value: "127.0.0.1" },
      { name: "details", value: "test login" },
    ]);
  });

  test("log() stringifies object details", async () => {
    await AuditLog.log({
      event: "sheet_create",
      details: { uid: "abc123", name: "Test" },
    });

    const insertArgs = mockInsert.mock.calls[0][1];
    const detailsCol = insertArgs.find((c) => c.name === "details");
    expect(JSON.parse(detailsCol.value)).toEqual({ uid: "abc123", name: "Test" });
  });

  test("log() rejects unknown events", async () => {
    await AuditLog.log({ event: "unknown_event" });

    expect(mockInsert).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("unknown event")
    );
  });

  test("log() handles null optional fields", async () => {
    await AuditLog.log({ event: "logout" });

    expect(mockInsert).toHaveBeenCalledWith("audit_log", [
      { name: "timestamp", value: expect.any(String) },
      { name: "event", value: "logout" },
      { name: "user_id", value: null },
      { name: "username", value: null },
      { name: "ip", value: null },
      { name: "details", value: "null" },
    ]);
  });

  test("log() does not throw on insert failure", async () => {
    mockInsert.mockRejectedValue(new Error("DB write failed"));

    await expect(
      AuditLog.log({ event: "login_failure", username: "test" })
    ).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      "AuditLog write error:",
      "DB write failed"
    );
  });

  test("log() stores ISO timestamp", async () => {
    await AuditLog.log({ event: "register", username: "newuser" });

    const insertArgs = mockInsert.mock.calls[0][1];
    const tsCol = insertArgs.find((c) => c.name === "timestamp");
    expect(new Date(tsCol.value).toISOString()).toBe(tsCol.value);
  });

  test("all valid events are accepted", async () => {
    const events = [
      "login_success", "login_failure", "register", "logout",
      "password_change", "token_refresh", "sheet_create", "sheet_update",
      "sheet_delete", "sheet_settings_update", "sheet_execute", "webhook_trigger",
    ];

    for (const event of events) {
      jest.clearAllMocks();
      await AuditLog.log({ event });
      expect(mockInsert).toHaveBeenCalledTimes(1);
    }
  });

  test("createTable() creates audit_log table", async () => {
    const mockCreateTable = jest.fn().mockResolvedValue(true);
    SQLiteManager.mockImplementation(() => ({
      createTable: mockCreateTable,
    }));

    await AuditLog.createTable();

    expect(mockCreateTable).toHaveBeenCalledWith("audit_log", [
      { name: "timestamp", type: "TEXT NOT NULL" },
      { name: "event", type: "TEXT NOT NULL" },
      { name: "user_id", type: "INTEGER" },
      { name: "username", type: "TEXT" },
      { name: "ip", type: "TEXT" },
      { name: "details", type: "TEXT" },
    ]);
  });
});
