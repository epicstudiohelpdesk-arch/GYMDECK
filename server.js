import express from "express";
import session from "express-session";
import authRoutes from "./routes/auth.js";
import { authMiddleware, clearAuthData } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Login at http://localhost:${PORT}/login`);
});