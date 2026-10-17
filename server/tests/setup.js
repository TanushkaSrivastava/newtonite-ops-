const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const { connectDB, disconnectDB } = require("../src/config/db");

const TEST_DB_URI =
  process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/newtonite_ops_test";

async function setupTestDB() {
  await connectDB(TEST_DB_URI);
}

async function clearTestDB() {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
}

async function teardownTestDB() {
  await clearTestDB();
  await disconnectDB();
}

module.exports = {
  setupTestDB,
  clearTestDB,
  teardownTestDB,
};
