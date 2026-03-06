const Plugin = require("../src/models/plugin");

describe("Plugin (base class)", () => {
  let plugin;

  beforeEach(() => {
    plugin = new Plugin();
  });

  test("name() returns 'Base Plugin'", () => {
    expect(plugin.name()).toBe("Base Plugin");
  });

  test("description() returns a string", () => {
    expect(typeof plugin.description()).toBe("string");
    expect(plugin.description().length).toBeGreaterThan(0);
  });

  test("icon() returns star emoji", () => {
    expect(plugin.icon()).toBe("🌟");
  });

  test("iconBase64() returns null", () => {
    expect(plugin.iconBase64()).toBeNull();
  });

  test("tags() returns empty array", () => {
    expect(plugin.tags()).toEqual([]);
  });

  test("paramsDefinition() returns empty array", () => {
    expect(plugin.paramsDefinition()).toEqual([]);
  });

  describe("log()", () => {
    test("returns structured log entry", () => {
      const entry = plugin.log("test message");
      expect(entry).toEqual({
        type: "info",
        name: "Base Plugin",
        message: "test message",
      });
    });

    test("defaults type to 'info'", () => {
      const entry = plugin.log("msg");
      expect(entry.type).toBe("info");
    });

    test("accepts custom type", () => {
      const entry = plugin.log("msg", "error");
      expect(entry.type).toBe("error");
    });
  });

  describe("logic()", () => {
    test("returns expected default structure", async () => {
      const result = await plugin.logic();
      expect(result).toEqual({
        status: { error: false, message: "" },
        output: { example: 0 },
      });
    });
  });
});
