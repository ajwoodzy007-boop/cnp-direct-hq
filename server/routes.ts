// Inside your registerRoutes function in server/routes.ts
passport.deserializeUser(async (id: number, done) => {
  try {
    // UPDATED: Using 'ispremium' to match your schema
    const users = await query(
      "SELECT id, email, tier, ispremium FROM users WHERE id = $1", 
      [id]
    );
    
    if (!users[0]) return done(null, false);
    
    // Map it for the session object so user.is_premium still works in code
    const user = {
      ...users[0],
      is_premium: (users[0] as any).ispremium 
    };
    
    done(null, user);
  } catch (err) {
    done(err);
  }
});
