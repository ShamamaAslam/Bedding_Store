const rateLimitStore = {};

const rateLimiter = ({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.' } = {}) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();

    if (!rateLimitStore[ip]) {
      rateLimitStore[ip] = [];
    }

    // Filter out timestamps older than windowMs
    rateLimitStore[ip] = rateLimitStore[ip].filter(timestamp => now - timestamp < windowMs);

    if (rateLimitStore[ip].length >= max) {
      return res.status(429).json({ success: false, message });
    }

    rateLimitStore[ip].push(now);
    next();
  };
};

module.exports = rateLimiter;
