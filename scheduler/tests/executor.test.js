// We need to mock node-cron and fetch before requiring the module
const mockSchedule = jest.fn();
const mockValidate = jest.fn();
const mockStop = jest.fn();

jest.mock("node-cron", () => ({
  schedule: (...args) => {
    mockSchedule(...args);
    return { stop: mockStop };
  },
  validate: (...args) => mockValidate(...args),
}));

// Set env before requiring
process.env.API_BASE_URL = "http://test-api:3001";
process.env.INTERNAL_API_KEY = "test_key";

const { syncCronJobs } = require("../src/executor");

describe("Executor", () => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidate.mockReturnValue(true);
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    // Reset global.fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    delete global.fetch;
  });

  function mockFetchSheets(sheets) {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sheets,
    });
  }

  test("syncCronJobs fetches sheets and schedules active cron sheets", async () => {
    const sheets = [
      {
        uid: "sheet1",
        name: "Test Sheet",
        is_active: 1,
        trigger_type: "cron",
        cron_schedule: "*/5 * * * *",
      },
    ];
    mockFetchSheets(sheets);

    await syncCronJobs();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://test-api:3001/sheet/list-internal",
      expect.objectContaining({
        headers: { "X-Internal-Key": "test_key" },
      })
    );
    expect(mockSchedule).toHaveBeenCalledWith(
      "*/5 * * * *",
      expect.any(Function)
    );
  });

  test("syncCronJobs does not schedule inactive sheets", async () => {
    const sheets = [
      {
        uid: "sheet1",
        name: "Inactive",
        is_active: 0,
        trigger_type: "cron",
        cron_schedule: "*/5 * * * *",
      },
    ];
    mockFetchSheets(sheets);

    await syncCronJobs();

    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test("syncCronJobs does not schedule non-cron sheets", async () => {
    const sheets = [
      {
        uid: "sheet1",
        name: "Webhook Sheet",
        is_active: 1,
        trigger_type: "webhook",
      },
    ];
    mockFetchSheets(sheets);

    await syncCronJobs();

    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test("syncCronJobs removes jobs for sheets no longer active", async () => {
    // First sync: add a job
    mockFetchSheets([
      {
        uid: "sheet1",
        name: "Active",
        is_active: 1,
        trigger_type: "cron",
        cron_schedule: "0 * * * *",
      },
    ]);
    await syncCronJobs();
    expect(mockSchedule).toHaveBeenCalledTimes(1);

    // Second sync: sheet is gone
    mockFetchSheets([]);
    await syncCronJobs();

    expect(mockStop).toHaveBeenCalled();
  });

  test("syncCronJobs updates jobs when schedule changes", async () => {
    // First sync
    mockFetchSheets([
      {
        uid: "sheet1",
        name: "Test",
        is_active: 1,
        trigger_type: "cron",
        cron_schedule: "0 * * * *",
      },
    ]);
    await syncCronJobs();

    // Second sync with changed schedule
    mockFetchSheets([
      {
        uid: "sheet1",
        name: "Test",
        is_active: 1,
        trigger_type: "cron",
        cron_schedule: "*/10 * * * *",
      },
    ]);
    await syncCronJobs();

    // Should have stopped old and created new
    expect(mockStop).toHaveBeenCalled();
    expect(mockSchedule).toHaveBeenCalledTimes(2);
  });

  test("syncCronJobs handles API fetch failure gracefully", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    // Should not throw
    await expect(syncCronJobs()).resolves.not.toThrow();
  });

  test("invalid cron schedule is rejected", async () => {
    mockValidate.mockReturnValue(false);
    mockFetchSheets([
      {
        uid: "sheet1",
        name: "Bad Cron",
        is_active: 1,
        trigger_type: "cron",
        cron_schedule: "invalid",
      },
    ]);

    await syncCronJobs();

    // schedule should not be called for invalid cron
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});
