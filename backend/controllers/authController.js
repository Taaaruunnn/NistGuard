const User = require('../models/User');
const { signToken, setAuthCookie, clearAuthCookie } = require('../middleware/auth');

const register = async (req, res) => {
  try {
    const { name, email, password, organizationName } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are all required.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const user = new User({
      name,
      email: String(email).toLowerCase(),
      organizationName: organizationName || '',
    });
    await user.setPassword(password);
    await user.save();

    const token = signToken(user);
    setAuthCookie(res, token);
    return res.status(201).json({ user: user.toPublicJSON(), token });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ message: 'Could not create the account.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+passwordHash');
    if (!user) return res.status(401).json({ message: 'Email or password is incorrect.' });

    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ message: 'Email or password is incorrect.' });

    const token = signToken(user);
    setAuthCookie(res, token);
    return res.json({ user: user.toPublicJSON(), token });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Could not sign in.' });
  }
};

const logout = async (req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
};

const me = async (req, res) => res.json({ user: req.user.toPublicJSON() });

module.exports = { register, login, logout, me };
