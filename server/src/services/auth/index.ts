import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_PATH = process.env.USERS_DB_PATH || path.join(__dirname, '../../../data/users.json');

fs.mkdirSync(path.dirname(USERS_PATH), { recursive: true });

interface User {
  id: string;
  username: string;
  email?: string;
  passwordHash: string;
  role: 'admin' | 'viewer' | 'operator';
  createdAt: string;
}

function loadUsers(): User[] {
  if (!fs.existsSync(USERS_PATH)) {
    // Create default admin
    const defaultAdmin: User = {
      id: 'admin_001',
      username: 'admin',
      email: 'admin@solar-ptz.local',
      passwordHash: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    saveUsers([defaultAdmin]);
    return [defaultAdmin];
  }
  try {
    return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveUsers(users: User[]) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

export function getUsers(): User[] {
  return loadUsers();
}

export function findUserByUsername(username: string): User | undefined {
  return loadUsers().find(u => u.username === username);
}

export function findUserById(id: string): User | undefined {
  return loadUsers().find(u => u.id === id);
}

export async function createUser(username: string, password: string, role: User['role'] = 'viewer', email?: string): Promise<User> {
  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    throw new Error('Username already exists');
  }
  const user: User = {
    id: `user_${Date.now()}`,
    username,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveUsers(users);
  return user;
}

export async function validatePassword(username: string, password: string): Promise<User | null> {
  const user = findUserByUsername(username);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export function updateUserPassword(userId: string, newPasswordHash: string) {
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx >= 0) {
    users[idx].passwordHash = newPasswordHash;
    saveUsers(users);
  }
}
