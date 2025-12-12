import { Request, Response, NextFunction } from 'express';
import { query } from '../db';

declare module 'express-session' {
  interface SessionData {
    user?: { id: number; email: string; tier: 'FREE' | 'PREMIUM'; betaExpires?: Date };
  }
}

export async function requirePremium(req: Request, res: Response, next: NextFunction) {
  const user = (req.session as any).user;

  if (!user) {
    return res.status(401).json({ success: false, error: "Please log in" });
  }

  // Check if user has actual PREMIUM tier (from Stripe subscription)
  if (user.tier === 'PREMIUM' && !user.betaExpires) {
    return next();
  }

  // Check for active beta pass
  try {
    const betaResult = await query(
      `SELECT * FROM beta_passes WHERE redeemed_by = $1 AND expires_at > NOW()`,
      [user.id]
    );
    
    if (betaResult.rows.length > 0) {
      // Update session with current beta status
      (req.session as any).user.tier = 'PREMIUM';
      (req.session as any).user.betaExpires = betaResult.rows[0].expires_at;
      return next();
    }
    
    // Beta expired or no beta - revert to actual tier from database
    const userResult = await query('SELECT tier FROM users WHERE id = $1', [user.id]);
    const actualTier = userResult.rows[0]?.tier || 'FREE';
    
    if (actualTier === 'PREMIUM') {
      (req.session as any).user.tier = 'PREMIUM';
      delete (req.session as any).user.betaExpires;
      return next();
    }
    
    // Not premium
    (req.session as any).user.tier = 'FREE';
    delete (req.session as any).user.betaExpires;
    
    res.status(403).json({ 
      success: false, 
      error: "PREMIUM_REQUIRED", 
      message: "Upgrade to Premium to access this feature." 
    });
  } catch (e) {
    console.error('Premium check error:', e);
    res.status(500).json({ success: false, error: "Access check failed" });
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if ((req.session as any).user) {
    next();
  } else {
    res.status(401).json({ success: false, error: "Authentication required" });
  }
}
