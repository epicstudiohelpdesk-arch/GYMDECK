// Authentication middleware - protects routes from unauthenticated access

export const authMiddleware = (req, res, next) => {
  if (!req.session || !req.session.user) {
    // Check if it's an API request (expects JSON)
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
    // It's a page request - redirect to login
    return res.redirect("/login");
  }
  next();
};

// Clear all authentication data from session
export const clearAuthData = (req) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
      }
    });
  }
};