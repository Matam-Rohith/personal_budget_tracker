import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'budget_store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not create data directory, using in-memory store:', err.message);
  }
}

// Password hashing utilities using Node.js native crypto
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, key] = stored.split(':');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(key, 'hex'));
  } catch {
    return false;
  }
}

// Generate simple secure session tokens
export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Initial demo seed data
function getDefaultData() {
  const demoSaltHash = hashPassword('demo123');
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  return {
    users: {
      demo: {
        id: 'usr_demo',
        username: 'demo',
        name: 'Rohith M.',
        email: 'demo@example.com',
        passwordHash: demoSaltHash,
        monthlyBudget: 25000,
        currency: '₹',
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    },
    sessions: {},
    transactions: [
      {
        id: 'tx_101',
        userId: 'usr_demo',
        type: 'income',
        category: 'Salary',
        amount: 65000,
        note: 'Monthly engineering salary',
        date: `${year}-${month}-01`,
        createdAt: `${year}-${month}-01T09:00:00.000Z`
      },
      {
        id: 'tx_102',
        userId: 'usr_demo',
        type: 'expense',
        category: 'Housing & Utilities',
        amount: 14000,
        note: 'Apartment rent & maintenance',
        date: `${year}-${month}-02`,
        createdAt: `${year}-${month}-02T10:30:00.000Z`
      },
      {
        id: 'tx_103',
        userId: 'usr_demo',
        type: 'expense',
        category: 'Food & Dining',
        amount: 3450,
        note: 'Supermarket weekly groceries',
        date: `${year}-${month}-05`,
        createdAt: `${year}-${month}-05T18:15:00.000Z`
      },
      {
        id: 'tx_104',
        userId: 'usr_demo',
        type: 'expense',
        category: 'Transportation',
        amount: 1200,
        note: 'Fuel & metro card recharge',
        date: `${year}-${month}-08`,
        createdAt: `${year}-${month}-08T11:45:00.000Z`
      },
      {
        id: 'tx_105',
        userId: 'usr_demo',
        type: 'income',
        category: 'Freelance',
        amount: 15000,
        note: 'Fullstack UI development project',
        date: `${year}-${month}-12`,
        createdAt: `${year}-${month}-12T14:00:00.000Z`
      },
      {
        id: 'tx_106',
        userId: 'usr_demo',
        type: 'expense',
        category: 'Food & Dining',
        amount: 1850,
        note: 'Team dinner & coffee',
        date: `${year}-${month}-15`,
        createdAt: `${year}-${month}-15T20:30:00.000Z`
      },
      {
        id: 'tx_107',
        userId: 'usr_demo',
        type: 'expense',
        category: 'Entertainment',
        amount: 999,
        note: 'Streaming subscriptions',
        date: `${year}-${month}-18`,
        createdAt: `${year}-${month}-18T16:20:00.000Z`
      },
      {
        id: 'tx_108',
        userId: 'usr_demo',
        type: 'expense',
        category: 'Health & Wellness',
        amount: 2500,
        note: 'Quarterly gym membership',
        date: `${year}-${month}-20`,
        createdAt: `${year}-${month}-20T08:00:00.000Z`
      }
    ]
  };
}

let cache = null;

export function loadDb() {
  if (cache) return cache;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      cache = JSON.parse(raw);
      // Ensure structure
      if (!cache.users) cache.users = {};
      if (!cache.sessions) cache.sessions = {};
      if (!cache.transactions) cache.transactions = [];
      return cache;
    }
  } catch (err) {
    console.warn('Error reading budget_store.json, creating initial store:', err.message);
  }

  cache = getDefaultData();
  saveDb(cache);
  return cache;
}

export function saveDb(data) {
  cache = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write database file:', err.message);
  }
}
