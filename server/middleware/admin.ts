import { Request, Response, NextFunction } from "express";

/**
 * Admin Middleware - Requires membershipTier === 'admin' (Drizzle camelCase)
 * Protects admin-only routes
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  console.log('MIDDLEWARE - Is Authenticated:', req.isAuthenticated());
  console.log('MIDDLEWARE - Session ID:', req.sessionID);

  // 1. Check if user is authenticated
  if (!req.isAuthenticated()) {
    console.log('MIDDLEWARE - REDIRECT: Line 11 - User not authenticated, sending 401');
    return res.status(401).json({ message: "Please log in to access this feature." });
  }

  const user = req.user as any;
  console.log("Admin Check User:", user);

  // 2. Check if user is admin via membershipTier (Drizzle maps to camelCase)
  if (user.membershipTier === 'admin' || user.tier === 'admin' || user.isAdmin === true) {
    return next();
  }

  // 3. If not admin
  console.log('MIDDLEWARE - REDIRECT: Line 25 - User authenticated but not admin, sending 403');
  res.status(403).json({ message: "Access Denied: Admin privileges required" });
}

