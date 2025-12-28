export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/auth", authRouter);

  // Map all possible market variations to the same safe router
  app.use("/api/market", oracleRouter);
  app.use("/api/oracle", oracleRouter);
  app.use("/api/sentinel", oracleRouter);

  // Map charts
  app.use("/api/chart", chartRouter);
  app.use("/api/charts", chartRouter);

  const httpServer = createServer(app);
  return httpServer;
}
