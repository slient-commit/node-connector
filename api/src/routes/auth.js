const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../../config");
const User = require("../models/user");

// Register
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    await User.createUser(username, password);
    res.status(201).json({ message: "User created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.getUserByUsername(username);

  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  const validPass = await bcrypt.compare(password, user.password);
  if (!validPass) return res.status(400).json({ error: "Invalid credentials" });

  const accessToken = jwt.sign({ id: user.id }, config.jwtSecret, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ id: user.id }, config.refreshTokenSecret);

  await User.updateRefreshToken(user.id, refreshToken);

  res.json({ accessToken, refreshToken });
});

// Refresh Token
router.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.sendStatus(401);
  const user = await User.getUserByRefreshToken(refreshToken);

  if (!user) return res.sendStatus(403);

  jwt.verify(refreshToken, config.refreshTokenSecret, (err, decoded) => {
    if (err) return res.sendStatus(403);

    const accessToken = jwt.sign({ id: user.id }, config.jwtSecret, {
      expiresIn: "15m",
    });
    res.json({ accessToken });
  });
});

// Protected route example
router.get("/profile", require("../middleware/authenticateToken"), async (req, res) => {
  const user = await User.getUserById(req.user.id);
  if (!user) return res.sendStatus(404);
  const { password, refreshToken, ...safeUser } = user;
  res.json(safeUser);
});

module.exports = router;
