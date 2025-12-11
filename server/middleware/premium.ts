import { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    memberData?: { id: number; email: string; tier: 'FREE' | 'PREMIUM' };
  }
}

export function requirePremium(req: Request, res: Response, next: NextFunction) {
  const member = req.session.memberData;

  if (!member) {
    return res.status(401).json({ success: false, error: "Please log in" });
  }

  if (member.tier === 'PREMIUM') {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      error: "PREMIUM_REQUIRED", 
      message: "Upgrade to Sentinel Pro to access AI Strategist." 
    });
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session.authenticated || req.session.memberData) {
    next();
  } else {
    res.status(401).json({ success: false, error: "Authentication required" });
  }
}
