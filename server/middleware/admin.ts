import { Request, Response, NextFunction } from "express";

/**
 * Admin Middleware - Requires membership_tier === 'admin'
 * Protects admin-only routes
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // 1. Check if user is authenticated
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Please log in to access this feature." });
  }

  const user = req.user as any;

  // 2. Check if user is admin via membership_tier
  if (user.membership_tier === 'admin' || user.tier === 'admin' || user.isAdmin === true) {
    return next();
  }

  // 3. If not admin
  res.status(403).json({ message: "Access Denied: Admin privileges required" });
}

