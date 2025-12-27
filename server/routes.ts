export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/auth", authRouter);

  // Exact matches for the red lines we saw in your screenshots
  app.use("/api/market/sentinel", oracleRouter);
  app.use("/api/market/daily", oracleRouter);
  app.use("/api/market", oracleRouter);
  app.use("/api/oracle", oracleRouter);

  app.use("/api/chart", chartRouter);

  const httpServer = createServer(app);
  return httpServer;
}
