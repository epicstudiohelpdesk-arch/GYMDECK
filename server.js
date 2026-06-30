import "dotenv/config";
import express from "express";
import session from "express-session";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import authRoutes from "./routes/auth.js";
import { authMiddleware, clearAuthData } from "./middleware/auth.js";

// NOTE: Dual Auth Path — This Express server handles legacy session-based auth
// for serving static authentication pages. The Tauri native auth (Rust commands)
// is the authoritative auth system for production desktop builds.
// See README.md > Architecture Notes for the deprecation plan.

const app = express();
const PORT = process.env.PORT || 3000;
const startTime = Date.now();
const serverStartTime = new Date().toISOString();

// Production logging setup — rotating daily log files
const LOG_DIR = process.env.GYMDECK_LOG_DIR || path.join(process.cwd(), "logs");
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const getLogFile = () => {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `server-${date}.log`);
};

const log = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const entry = JSON.stringify({ timestamp, level, message, ...meta });
  console.log(entry);
  try {
    fs.appendFileSync(getLogFile(), entry + "\n");
  } catch (err) {
    console.error(`Failed to write to log file: ${err.message}`);
  }
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api/")) {
      log("info", `${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
      });
    }
  });
  next();
});

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET === "your-secret-key-change-in-production") {
  log("warn", "SESSION_SECRET is not set or is a default value. Generate a secure secret with: openssl rand -hex 64");
}

app.use(
  session({
    secret: SESSION_SECRET || crypto.randomUUID(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.SESSION_SECURE === "true",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Make session available in templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Public routes (no authentication required)
app.use("/auth", authRoutes);

// Serve static files for authentication and public assets
app.use("/authentication", express.static("authentication"));
app.use("/public", express.static("public"));

// Login page
app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.sendFile(process.cwd() + "/authentication/index.html");
});

// Signup page
app.get("/signup", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.sendFile(process.cwd() + "/authentication/signup.html");
});

// Forgot password page
app.get("/forgot-password", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.sendFile(process.cwd() + "/authentication/forgot-password.html");
});

// OTP page
app.get("/otp", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.sendFile(process.cwd() + "/authentication/otp.html");
});

// Protected routes - require authentication
app.get("/dashboard", authMiddleware, (req, res) => {
  res.sendFile(process.cwd() + "/frontend/index.html");
});

// Serve protected static files (with auth check)
const protectedStatic = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  express.static("frontend")(req, res, next);
};

app.use("/frontend", protectedStatic);

// Logout
app.get("/logout", (req, res) => {
  clearAuthData(req);
  res.redirect("/login");
});

app.post("/logout", (req, res) => {
  clearAuthData(req);
  res.redirect("/login");
});

// API: Health check endpoint
app.get("/api/health", (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;
  const uptime = `${hours}h ${minutes}m ${seconds}s`;

  res.json({
    status: "ok",
    uptime,
    startedAt: serverStartTime,
    memory: process.memoryUsage(),
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
  });
});

// API: Check authentication status
app.get("/api/auth/status", (req, res) => {
  res.json({
    authenticated: !!req.session.user,
    user: req.session.user ? { email: req.session.user.email } : null,
  });
});

// 404 handler for protected routes
app.use((req, res, next) => {
  if (req.path.startsWith("/frontend/") || req.path === "/dashboard") {
    return res.redirect("/login");
  }
  next();
});

// Create and start server
const server = app.listen(PORT, () => {
  log("info", `Server started`, { port: PORT, url: `http://localhost:${PORT}/login` });
  log("info", `Logging to ${LOG_DIR}`);
});

// Graceful shutdown — WAL checkpoint, close connections, exit cleanly
const shutdown = (signal) => {
  log("info", `Received ${signal}. Starting graceful shutdown...`);
  server.close((err) => {
    if (err) {
      log("error", "Error closing server", { error: err.message });
      process.exit(1);
    }
    log("info", "HTTP server closed. Goodbye.");
    process.exit(0);
  });

  // Force shutdown after 10s if graceful close hangs
  setTimeout(() => {
    log("warn", "Forced shutdown after timeout");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => {
  log("error", "Uncaught exception", { error: err.message, stack: err.stack });
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  log("error", "Unhandled rejection", { error: String(reason) });
});