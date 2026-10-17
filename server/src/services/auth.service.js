const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { AppError } = require("../middleware/errorHandler");

function generateToken(user) {
  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET || "default_newtonite_ops_jwt_secret_dev_key_32bytes",
    { expiresIn: "7d" }
  );
}

async function register({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new AppError("An account with this email already exists", 409, "EMAIL_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    memberships: [],
  });

  const token = generateToken(user);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    },
    token,
  };
}

async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const token = generateToken(user);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    },
    token,
  };
}

async function getCurrentUser(userId) {
  const user = await User.findById(userId).populate("memberships.teamId", "name description");
  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    memberships: user.memberships || [],
  };
}

module.exports = {
  register,
  login,
  getCurrentUser,
  generateToken,
};
