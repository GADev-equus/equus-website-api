const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid Data',
      message: 'Invalid data format'
    });
  }

  if (err.code === 'EAUTH') {
    return res.status(500).json({
      success: false,
      error: 'Email Authentication Error',
      message: 'Email service authentication failed'
    });
  }

  if (err.code === 'ECONNECTION') {
    return res.status(500).json({
      success: false,
      error: 'Email Connection Error',
      message: 'Unable to connect to email service'
    });
  }

  if (err.code === 'ETIMEDOUT') {
    return res.status(500).json({
      success: false,
      error: 'Email Timeout Error',
      message: 'Email service request timed out'
    });
  }

  if (err.status) {
    return res.status(err.status).json({
      success: false,
      error: err.name || 'Error',
      message: err.message
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'Something went wrong on the server',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};