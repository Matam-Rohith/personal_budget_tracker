import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { loadDb, saveDb, hashPassword, verifyPassword, generateToken } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const host = '0.0.0.0';

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Standard security and cache headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Expose public Supabase configuration to frontend
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || 'https://wzdvggdksuuyfnhdlnvo.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'sb_publishable_K9EMkQs-SUyGdofydZwjUQ_o9UyfFD9'
  });
});

// Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.query.token;

  if (!token) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }

  const db = loadDb();
  const session = db.sessions[token];

  if (!session || !session.userId) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired session' });
  }

  const user = Object.values(db.users).find(u => u.id === session.userId);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'User not found' });
  }

  req.user = user;
  req.sessionToken = token;
  next();
}

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ ok: false, error: 'Username is required' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ ok: false, error: 'Valid email is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const db = loadDb();

    if (db.users[cleanUsername]) {
      return res.status(400).json({ ok: false, error: 'Username is already taken' });
    }

    const existingEmail = Object.values(db.users).find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existingEmail) {
      return res.status(400).json({ ok: false, error: 'An account with this email already exists' });
    }

    const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
    const newUser = {
      id: userId,
      username: cleanUsername,
      name: (name && name.trim()) || cleanUsername,
      email: email.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      monthlyBudget: 20000,
      currency: '₹',
      createdAt: new Date().toISOString()
    };

    db.users[cleanUsername] = newUser;

    // Create session
    const token = generateToken();
    db.sessions[token] = {
      userId,
      createdAt: new Date().toISOString()
    };

    saveDb(db);

    const { passwordHash, ...userProfile } = newUser;
    return res.status(201).json({
      ok: true,
      message: 'Account created successfully',
      user: userProfile,
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'Username and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const db = loadDb();
    const user = db.users[cleanUsername];

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ ok: false, error: 'Invalid username or password' });
    }

    const token = generateToken();
    db.sessions[token] = {
      userId: user.id,
      createdAt: new Date().toISOString()
    };

    saveDb(db);

    const { passwordHash, ...userProfile } = user;
    return res.json({
      ok: true,
      message: 'Login successful',
      user: userProfile,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const { passwordHash, ...userProfile } = req.user;
  return res.json({ ok: true, user: userProfile });
});

app.post('/api/auth/logout', authenticate, (req, res) => {
  const db = loadDb();
  delete db.sessions[req.sessionToken];
  saveDb(db);
  return res.json({ ok: true, message: 'Logged out successfully' });
});

// ----------------------------------------------------
// TRANSACTION ROUTES (CRUD)
// ----------------------------------------------------

app.get('/api/transactions', authenticate, (req, res) => {
  try {
    const db = loadDb();
    const { type, category, search, month, startDate, endDate, sortBy = 'date', sortOrder = 'desc' } = req.query;

    let txs = db.transactions.filter(t => t.userId === req.user.id);

    if (type && type !== 'all') {
      txs = txs.filter(t => t.type.toLowerCase() === type.toLowerCase());
    }

    if (category && category !== 'all') {
      txs = txs.filter(t => t.category.toLowerCase() === category.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      txs = txs.filter(t =>
        (t.note && t.note.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        String(t.amount).includes(q)
      );
    }

    if (month) {
      // YYYY-MM
      txs = txs.filter(t => t.date.startsWith(month));
    }

    if (startDate) {
      txs = txs.filter(t => t.date >= startDate);
    }

    if (endDate) {
      txs = txs.filter(t => t.date <= endDate);
    }

    // Sort
    txs.sort((a, b) => {
      if (sortBy === 'amount') {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      // default: date
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return res.json({ ok: true, count: txs.length, transactions: txs });
  } catch (err) {
    console.error('Fetch transactions error:', err);
    return res.status(500).json({ ok: false, error: 'Could not fetch transactions' });
  }
});

app.post('/api/transactions', authenticate, (req, res) => {
  try {
    const { type, category, amount, note, date } = req.body;

    if (!type || !['income', 'expense'].includes(type.toLowerCase())) {
      return res.status(400).json({ ok: false, error: 'Type must be either income or expense' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ ok: false, error: 'Amount must be a positive number' });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ ok: false, error: 'Category is required' });
    }

    const txDate = date ? date : new Date().toISOString().split('T')[0];

    const db = loadDb();
    const newTx = {
      id: 'tx_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
      userId: req.user.id,
      type: type.toLowerCase(),
      category: category.trim(),
      amount: Math.round(numAmount * 100) / 100,
      note: note ? note.trim() : '',
      date: txDate,
      createdAt: new Date().toISOString()
    };

    db.transactions.push(newTx);
    saveDb(db);

    return res.status(201).json({ ok: true, message: 'Transaction created', transaction: newTx });
  } catch (err) {
    console.error('Create transaction error:', err);
    return res.status(500).json({ ok: false, error: 'Could not create transaction' });
  }
});

app.put('/api/transactions/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const { type, category, amount, note, date } = req.body;

    const db = loadDb();
    const index = db.transactions.findIndex(t => t.id === id && t.userId === req.user.id);

    if (index === -1) {
      return res.status(404).json({ ok: false, error: 'Transaction not found' });
    }

    const current = db.transactions[index];

    if (type) {
      if (!['income', 'expense'].includes(type.toLowerCase())) {
        return res.status(400).json({ ok: false, error: 'Type must be income or expense' });
      }
      current.type = type.toLowerCase();
    }

    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ ok: false, error: 'Amount must be positive' });
      }
      current.amount = Math.round(numAmount * 100) / 100;
    }

    if (category) current.category = category.trim();
    if (note !== undefined) current.note = note.trim();
    if (date) current.date = date;
    current.updatedAt = new Date().toISOString();

    db.transactions[index] = current;
    saveDb(db);

    return res.json({ ok: true, message: 'Transaction updated', transaction: current });
  } catch (err) {
    console.error('Update transaction error:', err);
    return res.status(500).json({ ok: false, error: 'Could not update transaction' });
  }
});

app.delete('/api/transactions/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const db = loadDb();
    const initialLen = db.transactions.length;

    db.transactions = db.transactions.filter(t => !(t.id === id && t.userId === req.user.id));

    if (db.transactions.length === initialLen) {
      return res.status(404).json({ ok: false, error: 'Transaction not found' });
    }

    saveDb(db);
    return res.json({ ok: true, message: 'Transaction deleted' });
  } catch (err) {
    console.error('Delete transaction error:', err);
    return res.status(500).json({ ok: false, error: 'Could not delete transaction' });
  }
});

// ----------------------------------------------------
// BUDGET & SUMMARY ANALYTICS
// ----------------------------------------------------

app.get('/api/budget', authenticate, (req, res) => {
  return res.json({
    ok: true,
    monthlyBudget: req.user.monthlyBudget || 0,
    currency: req.user.currency || '₹'
  });
});

app.put('/api/budget', authenticate, (req, res) => {
  try {
    const { monthlyBudget, currency } = req.body;
    const numBudget = parseFloat(monthlyBudget);

    if (isNaN(numBudget) || numBudget < 0) {
      return res.status(400).json({ ok: false, error: 'Budget must be a valid non-negative number' });
    }

    const db = loadDb();
    const user = Object.values(db.users).find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

    user.monthlyBudget = Math.round(numBudget);
    if (currency) user.currency = currency.trim();

    saveDb(db);
    return res.json({
      ok: true,
      message: 'Monthly budget updated',
      monthlyBudget: user.monthlyBudget,
      currency: user.currency
    });
  } catch (err) {
    console.error('Update budget error:', err);
    return res.status(500).json({ ok: false, error: 'Could not update budget' });
  }
});

app.get('/api/summary', authenticate, (req, res) => {
  try {
    const db = loadDb();
    const userTxs = db.transactions.filter(t => t.userId === req.user.id);

    const now = new Date();
    const selectedMonth = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Filter current month
    const monthTxs = userTxs.filter(t => t.date.startsWith(selectedMonth));

    let monthIncome = 0;
    let monthExpense = 0;
    const categoryTotals = {};

    monthTxs.forEach(t => {
      if (t.type === 'income') {
        monthIncome += t.amount;
      } else {
        monthExpense += t.amount;
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      }
    });

    const netSavings = monthIncome - monthExpense;
    const savingsRate = monthIncome > 0 ? Math.round((netSavings / monthIncome) * 100) : 0;
    const monthlyBudget = req.user.monthlyBudget || 0;
    const budgetRemaining = Math.max(0, monthlyBudget - monthExpense);
    const budgetUsedPct = monthlyBudget > 0 ? Math.round((monthExpense / monthlyBudget) * 100) : 0;

    // Category breakdown sorted
    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        percentage: monthExpense > 0 ? Math.round((amount / monthExpense) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // Cashflow history for the past 6 months
    const cashFlowHistory = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });

      let inc = 0;
      let exp = 0;
      userTxs.forEach(t => {
        if (t.date.startsWith(mStr)) {
          if (t.type === 'income') inc += t.amount;
          else exp += t.amount;
        }
      });

      cashFlowHistory.push({
        month: mStr,
        label,
        income: Math.round(inc),
        expense: Math.round(exp)
      });
    }

    return res.json({
      ok: true,
      month: selectedMonth,
      currency: req.user.currency || '₹',
      stats: {
        totalIncome: Math.round(monthIncome * 100) / 100,
        totalExpense: Math.round(monthExpense * 100) / 100,
        netSavings: Math.round(netSavings * 100) / 100,
        savingsRate,
        monthlyBudget,
        budgetSpent: Math.round(monthExpense * 100) / 100,
        budgetRemaining: Math.round(budgetRemaining * 100) / 100,
        budgetUsedPct
      },
      categoryBreakdown,
      cashFlowHistory
    });
  } catch (err) {
    console.error('Summary analytics error:', err);
    return res.status(500).json({ ok: false, error: 'Could not generate summary' });
  }
});

// ----------------------------------------------------
// CSV EXPORT
// ----------------------------------------------------

app.get('/api/export', authenticate, (req, res) => {
  try {
    const db = loadDb();
    const userTxs = db.transactions
      .filter(t => t.userId === req.user.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    let csv = 'Transaction ID,Date,Type,Category,Amount,Description\n';
    userTxs.forEach(t => {
      const cleanNote = (t.note || '').replace(/"/g, '""');
      csv += `"${t.id}","${t.date}","${t.type}","${t.category}",${t.amount},"${cleanNote}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="budget_transactions.csv"');
    return res.send(csv);
  } catch (err) {
    console.error('Export CSV error:', err);
    return res.status(500).json({ ok: false, error: 'Could not export transactions' });
  }
});

// ----------------------------------------------------
// LEGACY REDIRECTS & STATIC SERVING
// ----------------------------------------------------

app.get(['/home.jsp', '/home'], (req, res) => res.redirect('/dashboard.html'));
app.get(['/addTransaction.jsp', '/addTransaction'], (req, res) => res.redirect('/dashboard.html'));
app.get(['/viewTransactions.jsp', '/viewTransactions'], (req, res) => res.redirect('/dashboard.html'));

// Static files
app.use(express.static(__dirname));

// Explicit HTML routes
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/register.html', (req, res) => res.sendFile(path.join(__dirname, 'register.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'register.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

// Default entry
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ ok: false, error: 'Endpoint not found' });
});

// Start listening only when directly executed (e.g. node server.js)
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
const isServerlessEnv = Boolean(process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME);

if (isDirectRun && !isServerlessEnv) {
  app.listen(port, host, () => {
    console.log(`Personal Budget Tracker production server running at http://${host}:${port}`);
  });
}

export default app;
