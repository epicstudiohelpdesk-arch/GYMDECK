import express from "express";
import crypto from "crypto";
import { userStore as users, otpStore } from "../lib/store.js";

const router = express.Router();

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const OTP_RATE_LIMIT_WINDOW_MS = 60_000;
const OTP_MAX_REQUESTS = 3;

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  }).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  }).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(hash));
}

const otpRateLimits = new Map();
function checkOtpRateLimit(email) {
  const now = Date.now();
  const entry = otpRateLimits.get(email);
  if (!entry || now - entry.windowStart > OTP_RATE_LIMIT_WINDOW_MS) {
    otpRateLimits.set(email, { windowStart: now, count: 1 });
    return { allowed: true };
  }
  if (entry.count >= OTP_MAX_REQUESTS) {
    const retryAfter = Math.ceil((OTP_RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfter };
  }
  entry.count += 1;
  return { allowed: true };
}

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export { users, otpStore };

router.get("/signup", (req, res) => {
  res.sendFile(process.cwd() + "/authentication/signup.html");
});

router.post("/signup", (req, res) => {
  const { email, password, name, phone } = req.body;
  const isJson = req.headers["content-type"]?.includes("application/json");

  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: "Email, password, and name are required"
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long"
    });
  }

  const existingUser = Array.from(users.values()).find((u) => u.email === email);
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User already exists with this email"
    });
  }

  const user = {
    id: crypto.randomUUID(),
    email,
    passwordHash: hashPassword(password),
    name,
    phone: phone || "",
    createdAt: new Date().toISOString(),
  };

  users.set(user.id, user);

  if (isJson) {
    return res.json({
      success: true,
      message: "Registration successful! Please login.",
      redirect: "/login",
    });
  }

  res.redirect("/login?registered=true");
});

router.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.sendFile(process.cwd() + "/authentication/index.html");
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const isJson = req.headers["content-type"]?.includes("application/json");

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  const user = Array.from(users.values()).find(
    (u) => u.email === email
  );

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
  }

  req.session.user = {
    id: user.id,
    email: user.email,
    name: user.name,
  };

  if (isJson) {
    return res.json({
      success: true,
      message: "Login successful!",
      redirect: "/dashboard",
    });
  }

  res.redirect("/dashboard");
});

router.get("/forgot-password", (req, res) => {
  res.sendFile(process.cwd() + "/authentication/forgot-password.html");
});

router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required"
    });
  }

  const rateCheck = checkOtpRateLimit(email);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      message: `Too many OTP requests. Try again in ${rateCheck.retryAfter} seconds.`
    });
  }

  const user = Array.from(users.values()).find((u) => u.email === email);

  if (user) {
    const otp = generateOTP();
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    console.log(`OTP for ${email}: ${otp}`);
  }

  res.json({
    success: true,
    message: "If an account exists with this email, you will receive an OTP.",
  });
});

router.get("/otp", (req, res) => {
  const { email } = req.query;

  if (!email || !otpStore.has(email)) {
    return res.redirect("/forgot-password");
  }

  const otpData = otpStore.get(email);

  if (Date.now() > otpData.expiresAt) {
    otpStore.delete(email);
    return res.redirect("/forgot-password?error=otp-expired");
  }

  res.sendFile(process.cwd() + "/authentication/otp.html");
});

router.post("/otp", (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Email, OTP, and new password are required"
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 8 characters long"
    });
  }

  const otpData = otpStore.get(email);

  if (!otpData) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired OTP. Please request a new one."
    });
  }

  if (Date.now() > otpData.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({
      success: false,
      message: "OTP has expired. Please request a new one."
    });
  }

  if (otpData.otp !== otp) {
    return res.status(400).json({
      success: false,
      message: "Invalid OTP. Please try again."
    });
  }

  const user = Array.from(users.values()).find((u) => u.email === email);
  if (user) {
    user.passwordHash = hashPassword(newPassword);
  }

  otpStore.delete(email);

  res.json({
    success: true,
    message: "Password reset successful! Please login with your new password.",
    redirect: "/login",
  });
});

export default router;
