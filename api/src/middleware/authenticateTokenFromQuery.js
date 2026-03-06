const jwt = require("jsonwebtoken");
const config = require("../../config");
const User = require("../models/user");
const tokenBlacklist = require("../token-blacklist");

function authenticateToken(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.sendStatus(401);

  if (tokenBlacklist.isBlacklisted(token)) return res.sendStatus(401);

  jwt.verify(token, config.jwtSecret, async (err, decoded) => {
    if (err) return res.sendStatus(403);
    const user = await User.getUserById(decoded.id);
    if (!user) return res.sendStatus(401);
    req.user = decoded;
    next();
  });
}

module.exports = authenticateToken;
