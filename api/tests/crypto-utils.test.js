const { encrypt, decrypt, isEncrypted } = require("../src/crypto-utils");

describe("crypto-utils", () => {
  describe("encrypt()", () => {
    test("returns an encrypted object with expected properties", () => {
      const result = encrypt("my_secret_password");
      expect(result).toHaveProperty("__encrypted", true);
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("iv");
      expect(result).toHaveProperty("tag");
    });

    test("returns empty/null/undefined values unchanged", () => {
      expect(encrypt("")).toBe("");
      expect(encrypt(null)).toBe(null);
      expect(encrypt(undefined)).toBe(undefined);
    });

    test("produces different ciphertext for the same plaintext (unique IV)", () => {
      const r1 = encrypt("same_value");
      const r2 = encrypt("same_value");
      expect(r1.data).not.toBe(r2.data);
      expect(r1.iv).not.toBe(r2.iv);
    });
  });

  describe("decrypt()", () => {
    test("decrypts an encrypted value back to the original", () => {
      const original = "super_secret_123!@#";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test("returns non-encrypted values unchanged (backward compat)", () => {
      expect(decrypt("plaintext")).toBe("plaintext");
      expect(decrypt(null)).toBe(null);
      expect(decrypt(undefined)).toBe(undefined);
      expect(decrypt({ foo: "bar" })).toEqual({ foo: "bar" });
    });

    test("handles numeric values converted to strings", () => {
      const encrypted = encrypt(12345);
      expect(decrypt(encrypted)).toBe("12345");
    });
  });

  describe("isEncrypted()", () => {
    test("returns true for encrypted objects", () => {
      const encrypted = encrypt("test");
      expect(isEncrypted(encrypted)).toBe(true);
    });

    test("returns false for non-encrypted values", () => {
      expect(isEncrypted("plaintext")).toBe(false);
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
      expect(isEncrypted(42)).toBe(false);
      expect(isEncrypted({ foo: "bar" })).toBe(false);
    });
  });

  describe("round-trip", () => {
    test("handles special characters", () => {
      const values = [
        "password with spaces",
        "p@$$w0rd!#%^&*()",
        "unicode: \u00e9\u00e8\u00ea",
        "newlines\nand\ttabs",
        "very long " + "x".repeat(10000),
      ];
      for (const val of values) {
        expect(decrypt(encrypt(val))).toBe(val);
      }
    });
  });
});
