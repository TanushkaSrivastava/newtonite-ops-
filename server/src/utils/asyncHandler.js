/**
 * Wraps an async route handler or middleware, catching any rejected promises
 * and passing the error to Express's next() error-handling middleware.
 */
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
