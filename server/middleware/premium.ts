import { Request, Response, NextFunction } from "express";

/**
 * Premium Middleware - Sanitized
 * Ensures users can access the dashboard.
 * Added an 'Admin Bypass' to prevent "Access Denied" for the owner.
 */
export function requirePremium(req: Request, res: Response, next: NextFunction) {
  console.log('*** REQUIRE PREMIUM MIDDLEWARE HIT:', req.path);
  // 1. Check if user is even logged in
  if (!req.isAuthenticated()) {
    console.log('*** REQUIRE PREMIUM: User not authenticated');
    return res.status(401).json({ message: "Please log in to access this feature." });
  }

  const user = req.user as any;

  // 2. Admin Bypass - Check membershipTier === 'admin' (Drizzle uses camelCase)
  if (user.membershipTier === 'admin' || user.tier === 'admin') {
    return next();
  }

  // 3. Check for Premium Status (membershipTier can be 'PREMIUM', 'PRO', etc.)
  if (user.membershipTier === 'PREMIUM' || user.membershipTier === 'PRO' || user.is_premium) {
    return next();
  }

  // 4. If all checks fail
  res.status(403).json({ message: "Access Denied: Premium Subscription Required" });
}
