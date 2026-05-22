'use strict';

const ApiError = require('../utils/ApiError');

function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const body = {
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message
  };

  if (error.details) body.details = error.details;
  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    body.error = error.message;
  }

  res.status(statusCode).json(body);
}

module.exports = {
  notFound,
  errorHandler
};
