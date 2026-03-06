const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../../config");
const User = require("../models/user");
const tokenBlacklist = require("../token-blacklist");
const { validatePassword } = require("../middleware/validatePassword");
const AuditLog = require("../models/audit-log");

function setCsrfCookie(res) {
  const csrfToken = crypto.randomBytes(32).toString("hex");
  res.cookie("csrfToken", csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
  });
}

// Register
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) {
    return res.status(400).json({ error: pwCheck.error });
  }
  try {
    await User.createUser(username, password);
    AuditLog.log({ event: "register", username, ip: req.ip });
    res.status(201).json({ message: "User created" });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.getUserByUsername(username);

  if (!user) {
    AuditLog.log({ event: "login_failure", username, ip: req.ip, details: "unknown user" });
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const validPass = await bcrypt.compare(password, user.password);
  if (!validPass) {
    AuditLog.log({ event: "login_failure", userId: user.id, username, ip: req.ip, details: "wrong password" });
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const accessToken = jwt.sign({ id: user.id }, config.jwtSecret, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ id: user.id }, config.refreshTokenSecret, {
    expiresIn: "7d",
  });

  await User.updateRefreshToken(user.id, refreshToken);

  res.cookie("token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/auth/refresh-token",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  setCsrfCookie(res);
  AuditLog.log({ event: "login_success", userId: user.id, username, ip: req.ip });
  res.json({ message: "Login successful" });
});

// Refresh Token
router.post("/refresh-token", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) return res.sendStatus(401);
  const user = await User.getUserByRefreshToken(refreshToken);

  if (!user) return res.sendStatus(403);

  jwt.verify(refreshToken, config.refreshTokenSecret, (err) => {
    if (err) return res.sendStatus(403);

    const accessToken = jwt.sign({ id: user.id }, config.jwtSecret, {
      expiresIn: "15m",
    });

    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    setCsrfCookie(res);
    AuditLog.log({ event: "token_refresh", userId: user.id, ip: req.ip });
    res.json({ message: "Token refreshed" });
  });
});

// Logout
router.post("/logout", require("../middleware/authenticateToken"), async (req, res) => {
  tokenBlacklist.add(req.cookies.token);
  await User.updateRefreshToken(req.user.id, null);
  res.clearCookie("token");
  res.clearCookie("refreshToken", { path: "/auth/refresh-token" });
  res.clearCookie("csrfToken");
  AuditLog.log({ event: "logout", userId: req.user.id, ip: req.ip });
  res.json({ message: "Logged out" });
});

// Verify token validity and user existence
router.get("/verify", require("../middleware/authenticateToken"), async (req, res) => {
  const user = await User.getUserById(req.user.id);
  if (!user) return res.sendStatus(401);
  res.json({ valid: true });
});

// Change password
router.put("/change-password", require("../middleware/authenticateToken"), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required" });
  }
  try {
    const user = await User.getUserById(req.user.id);
    if (!user) return res.sendStatus(404);

    const validPass = await bcrypt.compare(currentPassword, user.password);
    if (!validPass) return res.status(400).json({ error: "Current password is incorrect" });

    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({ error: pwCheck.error });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(user.id, hashed);
    tokenBlacklist.add(req.cookies.token);
    await User.updateRefreshToken(user.id, null);
    res.clearCookie("token");
    res.clearCookie("refreshToken", { path: "/auth/refresh-token" });
    AuditLog.log({ event: "password_change", userId: user.id, username: user.username, ip: req.ip });
    res.json({ message: "Password updated" });
  } catch (err) {
    console.error("Password change error:", err.message);
    res.status(500).json({ error: "Password change failed" });
  }
});

// Protected route example
router.get("/profile", require("../middleware/authenticateToken"), async (req, res) => {
  const user = await User.getUserById(req.user.id);
  if (!user) return res.sendStatus(404);
  const { password, refreshToken, ...safeUser } = user;
  res.json(safeUser);
});

module.exports = router;
