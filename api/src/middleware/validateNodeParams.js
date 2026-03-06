const VALID_PARAM_TYPES = ["string", "big_string", "number", "boolean", "select", "radio"];

function isPlainObject(val) {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

function sanitizeParam(param) {
  if (!isPlainObject(param)) return null;
  if (typeof param.name !== "string" || !param.name) return null;
  if (typeof param.alias !== "string" || !param.alias) return null;
  if (!VALID_PARAM_TYPES.includes(param.type)) return null;

  const clean = {
    name: param.name,
    alias: param.alias,
    type: param.type,
  };

  // value: allow string, number, boolean, null, undefined
  if (param.value !== undefined) {
    if (param.value === null || ["string", "number", "boolean"].includes(typeof param.value)) {
      clean.value = param.value;
    } else if (isPlainObject(param.value)) {
      // Encrypted values are stored as objects with __encrypted flag
      clean.value = param.value;
    } else {
      return null;
    }
  }

  // default: allow string, number, boolean, null, undefined
  if (param.default !== undefined) {
    if (param.default === null || ["string", "number", "boolean"].includes(typeof param.default)) {
      clean.default = param.default;
    } else {
      return null;
    }
  }

  // secret: boolean only
  if (param.secret !== undefined) {
    if (typeof param.secret !== "boolean") return null;
    clean.secret = param.secret;
  }

  // options: array of { label, value } objects
  if (param.options !== undefined) {
    if (!Array.isArray(param.options)) return null;
    clean.options = param.options.map((opt) => {
      if (!isPlainObject(opt)) return null;
      if (typeof opt.label !== "string" || typeof opt.value !== "string") return null;
      return { label: opt.label, value: opt.value };
    });
    if (clean.options.includes(null)) return null;
  }

  return clean;
}

function validateParams(params) {
  // Frontend sends {} for empty params — treat as empty array
  if (isPlainObject(params) && Object.keys(params).length === 0) {
    return { valid: true, sanitized: [] };
  }
  if (!Array.isArray(params)) return { valid: false, error: "params must be an array" };

  const sanitized = [];
  for (let i = 0; i < params.length; i++) {
    const clean = sanitizeParam(params[i]);
    if (!clean) {
      return { valid: false, error: `Invalid param at index ${i}` };
    }
    sanitized.push(clean);
  }

  return { valid: true, sanitized };
}

function validatePosition(position) {
  if (!isPlainObject(position)) return false;
  if (typeof position.x !== "number" || typeof position.y !== "number") return false;
  if (!isFinite(position.x) || !isFinite(position.y)) return false;
  return true;
}

function validateStringArray(arr) {
  if (!Array.isArray(arr)) return false;
  return arr.every((item) => typeof item === "string");
}

module.exports = { validateParams, validatePosition, validateStringArray, isPlainObject };
