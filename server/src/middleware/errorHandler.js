class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_SERVER_ERROR", details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
}

function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let code = err.code || "INTERNAL_ERROR";
  let message = err.message || "An unexpected internal server error occurred";
  let details = err.details || null;

  // Handle Zod validation errors
  if (err.name === "ZodError" || err.issues) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    const issues = err.issues || (err.errors ? err.errors : []);
    message = issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") || "Validation failed";
    details = issues;
  }
  // Handle Mongoose Validation Error
  else if (err.name === "ValidationError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }
  // Handle Mongoose CastError (e.g. invalid ObjectId format)
  else if (err.name === "CastError") {
    statusCode = 400;
    code = "INVALID_ID";
    message = `Invalid ${err.path}: ${err.value}`;
  }
  // Handle MongoDB Duplicate Key (E11000)
  else if (err.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE_RESOURCE";
    const fields = Object.keys(err.keyValue || {}).join(", ");
    message = `Duplicate value for field: ${fields || "resource"}`;
  }
  // Handle JWT errors
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    code = "INVALID_TOKEN";
    message = "Invalid authentication token";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    code = "TOKEN_EXPIRED";
    message = "Authentication token has expired";
  }

  // Hide internal error details in production unless explicitly defined
  if (statusCode === 500 && process.env.NODE_ENV === "production") {
    message = "An unexpected internal server error occurred";
  }

  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details && process.env.NODE_ENV !== "production") {
    response.error.details = details;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
};
