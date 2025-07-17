// ENTIRE FILE COMMENTED OUT FOR TESTING - RATE LIMITING DISABLED
// const rateLimit = require('express-rate-limit');

// // General authentication rate limiter
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // limit each IP to 5 requests per windowMs
//   message: {
//     success: false,
//     error: 'Too Many Requests',
//     message: 'Too many authentication attempts. Please try again in 15 minutes.'
//   },
//   standardHeaders: true, // Return rate limit info in headers
//   legacyHeaders: false, // Disable legacy headers
//   trustProxy: true, // Trust proxy for IP address
//   handler: (req, res) => {
//     console.log(`Rate limit exceeded for auth endpoint: ${req.ip} at ${new Date().toISOString()}`);
//     res.status(429).json({
//       success: false,
//       error: 'Too Many Requests',
//       message: 'Too many authentication attempts. Please try again in 15 minutes.',
//       retryAfter: Math.ceil(req.rateLimit.msBeforeNext / 1000)
//     });
//   }
// });

// // Strict password reset rate limiter
// const passwordResetLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 3, // limit each IP to 3 password reset requests per hour
//   message: {
//     success: false,
//     error: 'Too Many Requests',
//     message: 'Too many password reset attempts. Please try again in 1 hour.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   trustProxy: true,
//   handler: (req, res) => {
//     console.log(`Password reset rate limit exceeded: ${req.ip} at ${new Date().toISOString()}`);
//     res.status(429).json({
//       success: false,
//       error: 'Too Many Requests',
//       message: 'Too many password reset attempts. Please try again in 1 hour.',
//       retryAfter: Math.ceil(req.rateLimit.msBeforeNext / 1000)
//     });
//   }
// });

// // Registration rate limiter
// const registrationLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 3, // limit each IP to 3 registration attempts per hour
//   message: {
//     success: false,
//     error: 'Too Many Requests',
//     message: 'Too many registration attempts. Please try again in 1 hour.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   trustProxy: true,
//   handler: (req, res) => {
//     console.log(`Registration rate limit exceeded: ${req.ip} at ${new Date().toISOString()}`);
//     res.status(429).json({
//       success: false,
//       error: 'Too Many Requests',
//       message: 'Too many registration attempts. Please try again in 1 hour.',
//       retryAfter: Math.ceil(req.rateLimit.msBeforeNext / 1000)
//     });
//   }
// });

// // Email verification rate limiter
// const emailVerificationLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // limit each IP to 5 email verification requests per 15 minutes
//   message: {
//     success: false,
//     error: 'Too Many Requests',
//     message: 'Too many email verification attempts. Please try again in 15 minutes.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   trustProxy: true,
//   handler: (req, res) => {
//     console.log(`Email verification rate limit exceeded: ${req.ip} at ${new Date().toISOString()}`);
//     res.status(429).json({
//       success: false,
//       error: 'Too Many Requests',
//       message: 'Too many email verification attempts. Please try again in 15 minutes.',
//       retryAfter: Math.ceil(req.rateLimit.msBeforeNext / 1000)
//     });
//   }
// });

// // Token refresh rate limiter
// const tokenRefreshLimiter = rateLimit({
//   windowMs: 5 * 60 * 1000, // 5 minutes
//   max: 10, // limit each IP to 10 token refresh requests per 5 minutes
//   message: {
//     success: false,
//     error: 'Too Many Requests',
//     message: 'Too many token refresh attempts. Please try again in 5 minutes.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   trustProxy: true,
//   handler: (req, res) => {
//     console.log(`Token refresh rate limit exceeded: ${req.ip} at ${new Date().toISOString()}`);
//     res.status(429).json({
//       success: false,
//       error: 'Too Many Requests',
//       message: 'Too many token refresh attempts. Please try again in 5 minutes.',
//       retryAfter: Math.ceil(req.rateLimit.msBeforeNext / 1000)
//     });
//   }
// });

// // General API rate limiter
// const apiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: {
//     success: false,
//     error: 'Too Many Requests',
//     message: 'Too many API requests. Please try again in 15 minutes.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   trustProxy: true,
//   handler: (req, res) => {
//     console.log(`API rate limit exceeded: ${req.ip} at ${new Date().toISOString()}`);
//     res.status(429).json({
//       success: false,
//       error: 'Too Many Requests',
//       message: 'Too many API requests. Please try again in 15 minutes.',
//       retryAfter: Math.ceil(req.rateLimit.msBeforeNext / 1000)
//     });
//   }
// });

// // Admin action rate limiter (more lenient for admin users)
// const adminActionLimiter = rateLimit({
//   windowMs: 5 * 60 * 1000, // 5 minutes
//   max: 50, // limit each IP to 50 admin actions per 5 minutes
//   message: {
//     success: false,
//     error: 'Too Many Requests',
//     message: 'Too many admin actions. Please try again in 5 minutes.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   trustProxy: true,
//   handler: (req, res) => {
//     console.log(`Admin action rate limit exceeded: ${req.ip} at ${new Date().toISOString()}`);
//     res.status(429).json({
//       success: false,
//       error: 'Too Many Requests',
//       message: 'Too many admin actions. Please try again in 5 minutes.',
//       retryAfter: Math.ceil(req.rateLimit.msBeforeNext / 1000)
//     });
//   }
// });

// // Profile update rate limiter
// const profileUpdateLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 10, // limit each IP to 10 profile updates per hour
//   message: {
//     success: false,
//     error: 'Too Many Requests',
//     message: 'Too many profile updates. Please try again in 1 hour.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   trustProxy: true,
//   handler: (req, res) => {
//     console.log(`Profile update rate limit exceeded: ${req.ip} at ${new Date().toISOString()}`);
//     res.status(429).json({
//       success: false,
//       error: 'Too Many Requests',
//       message: 'Too many profile updates. Please try again in 1 hour.',
//       retryAfter: Math.ceil(req.rateLimit.msBeforeNext / 1000)
//     });
//   }
// });

// // Create a custom rate limiter factory
// const createRateLimiter = (options) => {
//   const defaultOptions = {
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 5,
//     message: {
//       success: false,
//       error: 'Too Many Requests',
//       message: 'Too many requests. Please try again later.'
//     },
//     standardHeaders: true,
//     legacyHeaders: false,
//     trustProxy: true,
//     handler: (req, res) => {
//       console.log(`Rate limit exceeded: ${req.ip} at ${new Date().toISOString()}`);
//       res.status(429).json({
//         success: false,
//         error: 'Too Many Requests',
//         message: options.message?.message || 'Too many requests. Please try again later.',
//         retryAfter: Math.ceil(req.rateLimit.msBeforeNext / 1000)
//       });
//     }
//   };

//   return rateLimit({ ...defaultOptions, ...options });
// };

// // Progressive delay limiter for failed login attempts
// const createProgressiveLimiter = (baseDelayMs = 1000) => {
//   const attempts = new Map();

//   return (req, res, next) => {
//     const key = req.ip;
//     const userAttempts = attempts.get(key) || 0;
    
//     if (userAttempts > 0) {
//       const delay = baseDelayMs * Math.pow(2, userAttempts - 1);
      
//       setTimeout(() => {
//         attempts.set(key, userAttempts + 1);
//         next();
//       }, delay);
//     } else {
//       attempts.set(key, 1);
//       next();
//     }

//     // Clean up old attempts every 10 minutes
//     if (Math.random() < 0.1) {
//       setTimeout(() => {
//         attempts.clear();
//       }, 10 * 60 * 1000);
//     }
//   };
// };

// // Rate limiter specifically for user-based actions (using user ID instead of IP)
// const createUserBasedLimiter = (windowMs, max, message) => {
//   const userAttempts = new Map();

//   return (req, res, next) => {
//     const userId = req.user?.id || req.ip;
//     const now = Date.now();
    
//     if (!userAttempts.has(userId)) {
//       userAttempts.set(userId, { count: 1, resetTime: now + windowMs });
//       return next();
//     }

//     const userLimit = userAttempts.get(userId);
    
//     if (now > userLimit.resetTime) {
//       userAttempts.set(userId, { count: 1, resetTime: now + windowMs });
//       return next();
//     }

//     if (userLimit.count >= max) {
//       const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
//       console.log(`User-based rate limit exceeded: ${userId} at ${new Date().toISOString()}`);
      
//       return res.status(429).json({
//         success: false,
//         error: 'Too Many Requests',
//         message: message || 'Too many requests. Please try again later.',
//         retryAfter: retryAfter
//       });
//     }

//     userLimit.count++;
//     userAttempts.set(userId, userLimit);
//     next();
//   };
// };

// DUMMY EXPORTS FOR TESTING - ALL RATE LIMITERS DISABLED
module.exports = {
  authLimiter: (req, res, next) => next(),
  passwordResetLimiter: (req, res, next) => next(),
  registrationLimiter: (req, res, next) => next(),
  emailVerificationLimiter: (req, res, next) => next(),
  tokenRefreshLimiter: (req, res, next) => next(),
  apiLimiter: (req, res, next) => next(),
  adminActionLimiter: (req, res, next) => next(),
  profileUpdateLimiter: (req, res, next) => next(),
  createRateLimiter: () => (req, res, next) => next(),
  createProgressiveLimiter: () => (req, res, next) => next(),
  createUserBasedLimiter: () => (req, res, next) => next()
};