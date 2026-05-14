const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// AI rate limiter: 20 requests per hour per user/IP
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => {
    return (req.user && req.user.id) ? `user_${req.user.id}` : ipKeyGenerator(req);
  },
  message: { error: 'Too many AI requests. Limit is 20 per hour.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false
});

// General limiter: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { aiRateLimiter, generalLimiter };
