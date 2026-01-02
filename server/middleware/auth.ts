import { Request, Response, NextFunction } from "express";

/**
 * Authentication Middleware - Requires user to be logged in
 * Protects routes that need any level of authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  console.log('AUTH MIDDLEWARE - Checking authentication for:', req.path);

  // Check if user is authenticated
  if (!req.isAuthenticated()) {
    console.log('AUTH MIDDLEWARE - User not authenticated, sending 401');
    return res.status(401).json({ message: "Please log in to access this feature." });
  }

  const user = req.user as any;
  console.log('AUTH MIDDLEWARE - User authenticated:', user?.email || 'unknown');

  // User is authenticated, proceed
  next();
}
