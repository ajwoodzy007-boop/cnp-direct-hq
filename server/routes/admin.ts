import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

/**
 * Standard Admin Check
 * Used by the frontend to verify if the user should see admin UI elements.
 */
router.get("/check", (req, res) => {
  if (req.isAuthenticated() && req.user?.email === 'ajwoodzy007@gmail.com') {
    return res.json({ isAdmin: true });
  }
  // Fallback for other users/roles if applicable
  res.json({ isAdmin: false });
});

/**
 * 🔍 CHECKLIST ITEM #1: DB CONNECTIVITY DIAGNOSTIC
 * This confirms the "Ghost" database (patient-cake) is reachable.
 */
router.get("/db-status", async (req, res) => {
  // SECURITY: Only allow the Master Admin email defined in your override logic
  if (!req.isAuthenticated() || req.user?.email !== 'ajwoodzy007@gmail.com') {
    return res.status(403).json({ 
      error: "Unauthorized", 
      message: "Sentinel OS: Administrative access required." 
    });
  }

  try {
    const startTime = Date.now();
    
    // Test the actual connection to the 'patient-cake' host
    const result = await db.execute(sql`SELECT current_database(), now(), version();`);
    const latency = Date.now() - startTime;

    res.json({
      status: "HEALTHY",
      host: "ep-patient-cake-afr4ov6x", // Verified from your Checklist
      latency: `${latency}ms`,
      database: result.rows[0].current_database,
      timestamp: result.rows[0].now,
      server_info: result.rows[0].version
    });
  } catch (error: any) {
    // Log the error to Railway console for debugging
    console.error("Critical DB Failure:", error);
    
    res.status(500).json({
      status: "CRITICAL_FAILURE",
      error: error.message,
      hint: "Check if DATABASE_URL is set correctly in Railway."
    });
  }
});

export default router;
