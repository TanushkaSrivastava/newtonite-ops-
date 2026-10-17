const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/auth.routes");
const teamRoutes = require("./routes/team.routes");
const workItemRoutes = require("./routes/workItem.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Newtonite Ops API is running",
    timestamp: new Date().toISOString(),
  });
});

// Mount API Routes
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/work-items", workItemRoutes);
app.use("/api/dashboard", dashboardRoutes);

// 404 Handler & Centralized Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
