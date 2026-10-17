const mongoose = require("mongoose");

let isConnected = false;

async function connectDB(uri = process.env.MONGODB_URI) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }

  try {
    const conn = await mongoose.connect(uri);
    isConnected = true;
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

module.exports = { connectDB, disconnectDB };
