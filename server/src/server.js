const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const app = require("./app");
const { connectDB, disconnectDB } = require("./config/db");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Newtonite Ops API running on http://localhost:${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log("Database disconnected. Server closed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

module.exports = app;
