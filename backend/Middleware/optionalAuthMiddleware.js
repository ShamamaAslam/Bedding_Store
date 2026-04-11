const jwt = require('jsonwebtoken');
const User = require('../Models/User');

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (user) {
      req.user = user;
    }
  } catch (_) {
    // Intentionally ignore token parsing errors for optional auth.
  }

  next();
};

module.exports = { optionalAuth };
