describe("authenticateInternalKey", () => {
  let authenticateInternalKey;
  let originalEnv;

  beforeAll(() => {
    // Set a known internal key before requiring the module
    originalEnv = process.env.INTERNAL_API_KEY;
    process.env.INTERNAL_API_KEY = "test_internal_key";
    // Clear module cache so config picks up the new env
    jest.resetModules();
    authenticateInternalKey = require("../src/middleware/authenticateInternalKey");
  });

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.INTERNAL_API_KEY = originalEnv;
    } else {
      delete process.env.INTERNAL_API_KEY;
    }
  });

  function createMocks(headerValue) {
    const req = {
      headers: {},
    };
    if (headerValue !== undefined) {
      req.headers["x-internal-key"] = headerValue;
    }
    const res = {
      _status: null,
      _json: null,
      status(code) {
        this._status = code;
        return this;
      },
      json(data) {
        this._json = data;
        return this;
      },
    };
    const next = jest.fn();
    return { req, res, next };
  }

  test("passes when valid key provided", () => {
    const { req, res, next } = createMocks("test_internal_key");
    authenticateInternalKey(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test("returns 403 when no key provided", () => {
    const { req, res, next } = createMocks(undefined);
    authenticateInternalKey(req, res, next);
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("returns 403 when wrong key provided", () => {
    const { req, res, next } = createMocks("wrong_key");
    authenticateInternalKey(req, res, next);
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});
