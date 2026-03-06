const logger = require("../src/logger");

describe("Logger", () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    delete process.env.LOG_LEVEL;
  });

  test("info() logs with INFO level", () => {
    logger.info("test info message");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logOutput = consoleSpy.mock.calls[0][0];
    expect(logOutput).toMatch(/\[INFO\]/);
    expect(logOutput).toMatch(/test info message/);
  });

  test("error() logs with ERROR level", () => {
    logger.error("test error message");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logOutput = consoleSpy.mock.calls[0][0];
    expect(logOutput).toMatch(/\[ERROR\]/);
    expect(logOutput).toMatch(/test error message/);
  });

  test("debug() logs when LOG_LEVEL=debug", () => {
    process.env.LOG_LEVEL = "debug";
    logger.debug("test debug message");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logOutput = consoleSpy.mock.calls[0][0];
    expect(logOutput).toMatch(/\[DEBUG\]/);
    expect(logOutput).toMatch(/test debug message/);
  });

  test("debug() does NOT log when LOG_LEVEL is not debug", () => {
    delete process.env.LOG_LEVEL;
    logger.debug("should not appear");
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test("all logs include ISO timestamp format", () => {
    logger.info("timestamp test");
    const logOutput = consoleSpy.mock.calls[0][0];
    // ISO timestamp pattern: [2024-01-01T00:00:00.000Z]
    expect(logOutput).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
