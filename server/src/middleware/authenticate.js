const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const { AppError } = require("./errorHandler");

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        new AppError("Authentication token is required", 401, "UNAUTHORIZED")
      );
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return next(
        new AppError("Authentication token is required", 401, "UNAUTHORIZED")
      );
    }

    const secret = process.env.JWT_SECRET || "default_newtonite_ops_jwt_secret_dev_key_32bytes";
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(
          new AppError("Authentication token has expired", 401, "TOKEN_EXPIRED")
        );
      }
      return next(
        new AppError("Invalid authentication token", 401, "INVALID_TOKEN")
      );
    }

    const userId = decoded.userId || decoded.id;
    if (!mongoose.isValidObjectId(userId)) {
      return next(
        new AppError("Invalid user token payload", 401, "INVALID_TOKEN")
      );
    }

    const user = await User.findById(userId).select("_id email name memberships");

    if (!user) {
      return next(
        new AppError(
          "The account associated with this token no longer exists",
          401,
          "USER_NOT_FOUND"
        )
      );
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id,
      email: user.email,
      name: user.name,
      memberships: user.memberships || [],
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;
