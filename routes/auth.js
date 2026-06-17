import express from "express";

const router = express.Router();

// In-memory user storage (replace with MongoDB later)
export const users = new Map();

// Helper to generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTPs temporarily (in production, use Redis with expiry)
export const otpStore = new Map();

// GET /auth/signup - Show signup page
router.get("/signup", (req, res) => {
  res.sendFile(process.cwd() + "/authentication/signup.html");
});

// POST /auth/signup - Register new user
router.post("/signup", (req, res) => {
  const { email, password, name, phone } = req.body;
  const isJson = req.headers["content-type"]?.includes("application/json");

  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: "Email, password, and name are required"
    });
  }

  // Check if user already exists
  const existingUser = Array.from(users.values()).find((u) => u.email === email);
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User already exists with this email"
    });
  }

  // Create new user (in production, hash the password!)
  const user = {
    id: Date.now().toString(),
    email,
    password, // TODO: Hash this password!
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

  // HTML form submission
  res.redirect("/login?registered=true");
});

// GET /auth/login - Show login page
router.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.sendFile(process.cwd() + "/authentication/index.html");
});

// POST /auth/login - Authenticate user
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const isJson = req.headers["content-type"]?.includes("application/json");

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  // Find user by email (in production, query the database)
  const user = Array.from(users.values()).find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
  }

  // Store user in session
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

  // HTML form submission fallback
  res.redirect("/dashboard");
});

// GET /auth/forgot-password - Show forgot password page
router.get("/forgot-password", (req, res) => {
  res.sendFile(process.cwd() + "/authentication/forgot-password.html");
});

// POST /auth/forgot-password - Request password reset
router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required"
    });
  }

  const user = Array.from(users.values()).find((u) => u.email === email);

  // Always return success to prevent email enumeration
  // In production, actually send the email
  if (user) {
    const otp = generateOTP();
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    });
    console.log(`OTP for ${email}: ${otp}`); // Remove in production!
  }

  res.json({
    success: true,
    message: "If an account exists with this email, you will receive an OTP.",
    // For demo: include OTP in response (remove in production!)
    ...(user && { otp: otpStore.get(email)?.otp }),
  });
});

// GET /auth/otp - Show OTP page
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

// POST /auth/otp - Verify OTP and reset password
router.post("/otp", (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Email, OTP, and new password are required"
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

  // Find and update user
  const user = Array.from(users.values()).find((u) => u.email === email);

  if (user) {
    user.password = newPassword; // TODO: Hash this!
  }

  otpStore.delete(email);

  res.json({
    success: true,
    message: "Password reset successful! Please login with your new password.",
    redirect: "/login",
  });
});

export default router;