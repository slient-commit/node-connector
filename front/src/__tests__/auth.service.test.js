import { describe, test, expect, beforeEach, vi } from "vitest";
import AuthService from "../services/auth.service.js";

describe("AuthService", () => {
  let service;

  beforeEach(() => {
    globalThis.window = globalThis.window || {};
    window.__API_BASE_URL__ = "http://localhost:3001";
    vi.restoreAllMocks();
    service = new AuthService();
  });

  describe("isAuthenticated()", () => {
    test("returns true when server verify succeeds", async () => {
      vi.spyOn(service.api, "get").mockResolvedValue({ ok: true });
      const result = await service.isAuthenticated();
      expect(result).toBe(true);
    });

    test("returns false when server verify fails", async () => {
      vi.spyOn(service.api, "get").mockResolvedValue({ ok: false });
      const result = await service.isAuthenticated();
      expect(result).toBe(false);
    });

    test("returns false when server verify throws", async () => {
      vi.spyOn(service.api, "get").mockRejectedValue(new Error("Network error"));
      const result = await service.isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe("login()", () => {
    test("succeeds when server returns ok", async () => {
      vi.spyOn(service.api, "post").mockResolvedValue({ ok: true });
      await expect(service.login("user", "pass")).resolves.toBeUndefined();
    });

    test("throws when server returns error", async () => {
      vi.spyOn(service.api, "post").mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Invalid credentials" }),
      });
      await expect(service.login("user", "wrong")).rejects.toThrow("Invalid credentials");
    });
  });

  describe("logout()", () => {
    test("calls server logout endpoint", async () => {
      const postSpy = vi.spyOn(service.api, "post").mockResolvedValue({ ok: true });
      await service.logout();
      expect(postSpy).toHaveBeenCalledWith("/auth/logout");
    });

    test("does not throw even if server logout fails", async () => {
      vi.spyOn(service.api, "post").mockRejectedValue(new Error("Network error"));
      await expect(service.logout()).resolves.toBeUndefined();
    });
  });
});
