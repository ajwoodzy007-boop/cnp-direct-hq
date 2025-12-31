/**
 * Permission utilities for checking user access
 */

export interface User {
  email: string;
  tier?: string;
  membership_tier?: string;
  isAdmin?: boolean;
  is_premium?: boolean;
}

/**
 * Check if user has premium access (PREMIUM tier, PRO tier, or admin)
 */
export function hasPremiumAccess(user: User | null): boolean {
  if (!user) return false;
  
  // Admin has access to everything
  if (user.membership_tier === 'admin' || user.tier === 'admin' || user.isAdmin === true) {
    return true;
  }
  
  // Check for premium tiers
  const tier = user.membership_tier || user.tier || '';
  return tier === 'PREMIUM' || tier === 'PRO' || user.is_premium === true;
}

/**
 * Check if user is admin
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.membership_tier === 'admin' || user.tier === 'admin' || user.isAdmin === true;
}

