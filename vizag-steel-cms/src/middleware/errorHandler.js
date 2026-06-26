const logger = require('../utils/logger');

const handleCastErrorDB = (err) => ({
  statusCode: 400,
  message: `Invalid ${err.path}: ${err.value}`,
});

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return {
    statusCode: 400,
    message: `Duplicate value for field '${field}': "${value}". Please use a different value.`,
  };
};

const handleValidationErrorDB = (err) => ({
  statusCode: 400,
  message: Object.values(err.errors).map((e) => e.message).join('. '),
});

const handleJWTError = () => ({
  statusCode: 401,
  message: 'Invalid token. Please log in again.',
});

const handleJWTExpiredError = () => ({
  statusCode: 401,
  message: 'Your token has expired. Please log in again.',
});

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Known Mongoose/JWT errors
  if (err.name === 'CastError') ({ statusCode, message } = handleCastErrorDB(err));
  if (err.code === 11000) ({ statusCode, message } = handleDuplicateFieldsDB(err));
  if (err.name === 'ValidationError') ({ statusCode, message } = handleValidationErrorDB(err));
  if (err.name === 'JsonWebTokenError') ({ statusCode, message } = handleJWTError());
  if (err.name === 'TokenExpiredError') ({ statusCode, message } = handleJWTExpiredError());

  // Log server errors
  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${message}`, {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
