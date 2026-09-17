const jwt = require('jsonwebtoken');
const User = require('../models/User');

const COOKIE_NAME = 'nistguard_token';
const TOKEN_TTL = '7d';

const secret = () => process.env.JWT_SECRET || process.env.SESSION_SECRET || 'nistguard-insecure-dev-secret';

const signToken = (user) => jwt.sign({ sub: user._id.toString() }, secret(), { expiresIn: TOKEN_TTL });

/**
 * The token is issued twice on purpose: as an httpOnly cookie (nice when the
 * API and client share a site) and in the JSON body for the client to hold as
 * a bearer token. Frontend and backend live on different Vercel domains, and
 * third-party cookies are unreliable there, so the bearer token is what
 * actually carries the session in production. The cookie is the fallback.
 */
const setAuthCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

const clearAuthCookie = (res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
};

const readToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  return null;
};

const requireAuth = async (req, res, next) => {
  try {
    const token = readToken(req);
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    const payload = jwt.verify(token, secret());
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'Session no longer valid' });

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
};

module.exports = { requireAuth, signToken, setAuthCookie, clearAuthCookie, COOKIE_NAME };
