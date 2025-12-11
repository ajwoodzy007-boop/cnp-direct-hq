import { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    user?: { id: number; email: string; tier: 'FREE' | 'PREMIUM' };
  }
}

export function requirePremium(req: Request, res: Response, next: NextFunction) {
  const user = (req.session as any).user;

  if (!user) {
    return res.status(401).json({ success: false, error: "Please log in" });
  }

  if (user.tier === 'PREMIUM') {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      error: "PREMIUM_REQUIRED", 
      message: "Upgrade to Premium to access this feature." 
    });
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if ((req.session as any).user) {
    next();
  } else {
    res.status(401).json({ success: false, error: "Authentication required" });
  }
}
