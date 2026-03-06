const Delay = require("../../plugins/delay");

describe("Delay Plugin", () => {
  let plugin;

  beforeEach(() => {
    plugin = new Delay();
    // Silence log output
    plugin.log = jest.fn((msg, type) => ({ type: type || "info", name: "Delay", message: msg }));
  });

  test("returns correct metadata", () => {
    expect(plugin.name()).toBe("Delay");
    expect(plugin.tags()).toEqual(["flow"]);
    expect(typeof plugin.description()).toBe("string");
    expect(typeof plugin.icon()).toBe("string");
  });

  test("waits specified duration", async () => {
    jest.useFakeTimers();
    const promise = plugin.logic({ duration: "500" });
    jest.advanceTimersByTime(500);
    const result = await promise;
    expect(result.status.error).toBe(false);
    expect(result.output.duration).toBe(500);
    jest.useRealTimers();
  });

  test("uses default 1000ms when no duration provided", async () => {
    jest.useFakeTimers();
    const promise = plugin.logic({});
    jest.advanceTimersByTime(1000);
    const result = await promise;
    expect(result.output.duration).toBe(1000);
    jest.useRealTimers();
  });

  test("returns input in output", async () => {
    jest.useFakeTimers();
    const input = { key: "value" };
    const promise = plugin.logic({ duration: "100", input });
    jest.advanceTimersByTime(100);
    const result = await promise;
    expect(result.output.input).toEqual(input);
    jest.useRealTimers();
  });

  test("paramsDefinition returns duration param", () => {
    const params = plugin.paramsDefinition();
    expect(params).toHaveLength(1);
    expect(params[0].alias).toBe("duration");
    expect(params[0].type).toBe("number");
  });
});
