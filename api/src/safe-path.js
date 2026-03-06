const path = require("path");

const DEFAULT_BASE_DIR = process.env.DATA_DIR || "/data";

/**
 * Resolves a user-supplied file path and ensures it stays within the allowed
 * base directory.  Returns the resolved absolute path, or throws if the path
 * escapes the sandbox.
 *
 * @param {string} filePath - The user-supplied path (absolute or relative).
 * @param {string} [baseDir] - Allowed root directory (defaults to DATA_DIR or /data).
 * @returns {string} Resolved absolute path guaranteed to be inside baseDir.
 */
function safePath(filePath, baseDir) {
  const root = path.resolve(baseDir || DEFAULT_BASE_DIR);
  const resolved = path.resolve(root, filePath);

  // Ensure the resolved path starts with the root + separator (or equals root exactly)
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Path traversal denied: "${filePath}" escapes the allowed directory`);
  }

  return resolved;
}

module.exports = { safePath, DEFAULT_BASE_DIR };
