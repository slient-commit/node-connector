// Routes that don't require CSRF (no auth cookie yet or use different auth)
const EXEMPT_ROUTES = ["/auth/login", "/auth/register", "/auth/refresh-token"];

function verifyCsrfToken(req, res, next) {
  // Skip safe methods (GET, HEAD, OPTIONS)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  // Skip unauthenticated auth routes (no CSRF cookie exists yet)
  if (EXEMPT_ROUTES.includes(req.path)) return next();

  // Skip internal API key routes (scheduler/CLI use header auth, not cookies)
  if (req.headers["x-internal-key"]) return next();

  const cookieToken = req.cookies && req.cookies.csrfToken;
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: "CSRF token mismatch" });
  }

  next();
}

module.exports = verifyCsrfToken;
