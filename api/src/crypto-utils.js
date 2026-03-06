const crypto = require("crypto");
const config = require("../config");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey() {
  return crypto.createHash("sha256").update(config.encryptionKey).digest();
}

function encrypt(plaintext) {
  if (plaintext === undefined || plaintext === null || plaintext === "") {
    return plaintext;
  }
  const text = typeof plaintext === "string" ? plaintext : String(plaintext);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();
  return {
    __encrypted: true,
    data: encrypted,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

function decrypt(encryptedObj) {
  if (!encryptedObj || !encryptedObj.__encrypted) {
    return encryptedObj;
  }
  const key = getKey();
  const iv = Buffer.from(encryptedObj.iv, "base64");
  const tag = Buffer.from(encryptedObj.tag, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encryptedObj.data, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function isEncrypted(value) {
  return value !== null && typeof value === "object" && value.__encrypted === true;
}

module.exports = { encrypt, decrypt, isEncrypted };
