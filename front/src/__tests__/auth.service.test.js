import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import AuthService from "../services/auth.service.js";

// Helper to create a JWT-like token with a given expiration
function makeToken(exp) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ id: 1, exp }));
  return `${header}.${payload}.fakesignature`;
}

describe("AuthService", () => {
  let service;

  beforeEach(() => {
    // Mock window.__API_BASE_URL__ for API class
    globalThis.window = globalThis.window || {};
    window.__API_BASE_URL__ = "http://localhost:3001";
    localStorage.clear();
    service = new AuthService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("isJwtExpired()", () => {
    test("returns false for a valid (non-expired) token", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const token = makeToken(futureExp);
      expect(service.isJwtExpired(token)).toBe(false);
    });

    test("returns true for an expired token", () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const token = makeToken(pastExp);
      expect(service.isJwtExpired(token)).toBe(true);
    });

    test("returns true for a malformed token", () => {
      expect(service.isJwtExpired("not.a.token")).toBe(true);
      expect(service.isJwtExpired("")).toBe(true);
      expect(service.isJwtExpired("abc")).toBe(true);
    });
  });

  describe("isAuthenticated()", () => {
    test("returns false when no token in localStorage", () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    test("returns true when valid token exists", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      localStorage.setItem("token", makeToken(futureExp));
      expect(service.isAuthenticated()).toBe(true);
    });

    test("returns false when token is expired", () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      localStorage.setItem("token", makeToken(pastExp));
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe("logout()", () => {
    test("removes token and refreshToken from localStorage", () => {
      localStorage.setItem("token", "some_token");
      localStorage.setItem("refreshToken", "some_refresh");
      service.logout();
      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("refreshToken")).toBeNull();
    });
  });
});
