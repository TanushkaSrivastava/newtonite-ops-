const { AppError } = require("./errorHandler");

/**
 * Middleware factory that validates req.body, req.query, or req.params against a Zod schema.
 */
function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        const issues = result.error.issues || [];
        const message = issues
          .map((i) => `${i.path.length ? i.path.join(".") + ": " : ""}${i.message}`)
          .join("; ");
        return next(new AppError(message || "Validation failed", 400, "VALIDATION_ERROR", issues));
      }
      req[source] = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = validate;
