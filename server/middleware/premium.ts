import { Request, Response, NextFunction } from "express";

/**
 * Premium Middleware - Sanitized
 * Ensures users can access the dashboard.
 * Added an 'Admin Bypass' to prevent "Access Denied" for the owner.
 */
export function requirePremium(req: Request, res: Response, next: NextFunction) {
  // 1. Check if user is even logged in
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Please log in to access this feature." });
  }

  const user = req.user as any;

  // 2. CEO/Admin Bypass 
  // If your email is the one in the screenshot, you get full access.
  if (user.email === 'ajwoodzy007@gmail.com' || user.is_admin === true) {
    return next();
  }

  // 3. Check for Premium Status
  if (user.is_premium) {
    return next();
  }

  // 4. If all checks fail
  res.status(403).json({ message: "Access Denied: Premium Subscription Required" });
}
