import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies.careerai_access;
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (payload.type !== 'access') throw new Error('Invalid token type');
    const user = await User.findById(payload.sub).select('-__v');
    if (!user) return res.status(401).json({ success: false, message: 'User session is no longer valid', code: 'SESSION_INVALID' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired', code: 'SESSION_EXPIRED' });
  }
}
