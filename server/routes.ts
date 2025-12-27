export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/auth", authRouter);

  // Market & Oracle routes
  app.use("/api/market", oracleRouter);
  app.use("/api/oracle", oracleRouter);
  app.use("/api/sentinel", oracleRouter);

  // Chart Redundancy: Maps both singular and plural to catch all frontend calls
  app.use("/api/chart", chartRouter);
  app.use("/api/charts", chartRouter);
  app.use("/api/market/charts", chartRouter); // Common in these dashboard builds

  const httpServer = createServer(app);
  return httpServer;
}
