import { Router } from 'express';
import { z } from 'zod';
import { createUser, validatePassword, getUsers, findUserById } from '../services/auth/index.js';
import { generateToken, authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  email: z.string().email().optional(),
  role: z.enum(['admin','viewer','operator']).default('viewer')
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const user = await validatePassword(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      expiresIn: process.env.JWT_EXPIRES || '7d'
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/register', authMiddleware as any, adminOnly as any, async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const user = await createUser(data.username, data.password, data.role, data.email);
    res.status(201).json({ id: user.id, username: user.username, role: user.role, email: user.email });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Public register if no users exist or AUTH_DISABLED
router.post('/register/public', async (req, res) => {
  const users = getUsers();
  // Only allow public register if no admin exists or in mock mode
  if (users.length > 1 && process.env.MOCK_MODE !== 'true' && process.env.ALLOW_PUBLIC_REGISTER !== 'true') {
    return res.status(403).json({ error: 'Public registration disabled. Contact admin.' });
  }
  try {
    const data = registerSchema.parse(req.body);
    const user = await createUser(data.username, data.password, data.role, data.email);
    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    res.status(201).json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/me', authMiddleware as any, (req: AuthRequest, res) => {
  const user = findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt });
});

router.get('/users', authMiddleware as any, adminOnly as any, (req, res) => {
  const users = getUsers().map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, createdAt: u.createdAt }));
  res.json(users);
});

export default router;
