const Loop = require("../../plugins/loop");

describe("Loop Plugin", () => {
  let plugin;

  beforeEach(() => {
    plugin = new Loop();
    plugin.log = jest.fn((msg, type) => ({
      type: type || "info",
      name: "Loop",
      message: msg,
    }));
  });

  test("returns correct metadata", () => {
    expect(plugin.name()).toBe("Loop");
    expect(plugin.tags()).toEqual(["flow"]);
  });

  test("paramsDefinition returns items and count", () => {
    const params = plugin.paramsDefinition();
    const aliases = params.map((p) => p.alias);
    expect(aliases).toContain("items");
    expect(aliases).toContain("count");
  });

  test("parses JSON array items and returns __isLoop marker", async () => {
    const result = await plugin.logic({
      items: '["a", "b", "c"]',
    });
    expect(result.status.error).toBe(false);
    expect(result.output.__isLoop).toBe(true);
    expect(result.output.__items).toEqual(["a", "b", "c"]);
  });

  test("count-based iteration creates range 0..N-1", async () => {
    const result = await plugin.logic({
      items: "",
      count: "3",
    });
    expect(result.status.error).toBe(false);
    expect(result.output.__isLoop).toBe(true);
    expect(result.output.__items).toEqual([0, 1, 2]);
  });

  test("invalid JSON returns error", async () => {
    const result = await plugin.logic({
      items: "not valid json",
    });
    expect(result.status.error).toBe(true);
    expect(result.status.message).toMatch(/invalid/i);
  });

  test("non-array JSON returns error", async () => {
    const result = await plugin.logic({
      items: '{"key": "value"}',
    });
    expect(result.status.error).toBe(true);
    expect(result.status.message).toMatch(/array/i);
  });

  test("zero count with no items returns error", async () => {
    const result = await plugin.logic({
      items: "",
      count: "0",
    });
    expect(result.status.error).toBe(true);
  });

  test("items takes precedence over count", async () => {
    const result = await plugin.logic({
      items: '["x"]',
      count: "5",
    });
    expect(result.output.__items).toEqual(["x"]);
  });
});
