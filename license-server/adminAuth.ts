import { Request, Response, NextFunction } from 'express';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

export const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  const email = req.headers['x-admin-email'] || req.query.email;
  if (!ADMIN_EMAIL || !ADMIN_SECRET) {
    return res.status(500).json({ error: 'ADMIN_CONFIG_MISSING' });
  }
  if (token === ADMIN_SECRET && email === ADMIN_EMAIL) {
    return next();
  }
  return res.status(401).json({ error: 'UNAUTHORIZED' });
};
