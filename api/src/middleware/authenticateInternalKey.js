const config = require("../../config");

function authenticateInternalKey(req, res, next) {
  const key = req.headers["x-internal-key"];
  if (!key || key !== config.internalApiKey) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

module.exports = authenticateInternalKey;
