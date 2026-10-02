# Personal Budget Tracker (Supabase Integration)

A full-stack personal finance and expense tracking web application integrated with **Supabase Authentication** and **Supabase PostgreSQL** with Row Level Security (RLS).

Features a double-entry transaction ledger, monthly spending ceilings with threshold warning alerts, cash flow analytics, and exportable CSV audit trails.

---

## Supabase Architecture & Database Setup

### 1. Execute SQL Migration in Supabase

Open your **Supabase Dashboard** -> **SQL Editor** -> **New query**, and execute the script in [`supabase-schema.sql`](supabase-schema.sql):

```sql
-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_user_category_month_year UNIQUE (user_id, category, month, year)
);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, year, month);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES (Users can only SELECT, INSERT, UPDATE, DELETE their own data)
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own budgets" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON public.budgets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

-- 7. AUTOMATIC PROFILE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''), now())
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## Environment Variables Configuration

Configure the following variables in `.env` (local) or in your hosting provider's dashboard (Vercel / Render):

```env
PORT=3000
SUPABASE_URL=https://wzdvggdksuuyfnhdlnvo.supabase.co
SUPABASE_ANON_KEY=sb_publishable_K9EMkQs-SUyGdofydZwjUQ_o9UyfFD9
```

- **Client-Side Safety**: Only the Supabase Project URL and Public Anon/Publishable Key are exposed to the browser. The `service_role` secret key is never used in client code.
- **Row Level Security**: The anonymous publishable key works in tandem with Supabase user JWT tokens (`auth.uid()`) to restrict data access to the authenticated owner.

---

## Authentication & Application Flow

1. **Registration (`register.html`)**:
   - Collects Name, Email, Password.
   - Calls `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`.
   - The trigger automatically writes the user profile into `profiles`.
   - Session is established and redirects to `dashboard.html`.

2. **Login (`login.html`)**:
   - Authenticates via `supabase.auth.signInWithPassword({ email, password })`.
   - Automatically handles session restoration on page reopen via `supabase.auth.getSession()`.
   - Redirects to `dashboard.html`.

3. **Protected Dashboard (`dashboard.html`)**:
   - Checks `supabase.auth.getSession()` on mount.
   - If not authenticated, immediately redirects to `login.html`.
   - Displays user's name and email in the top bar.

4. **Transactions Ledger (CRUD)**:
   - **Create**: Inserts record with `user_id: user.id`.
   - **Read**: Queries `supabase.from('transactions').select('*')` filtered by selected month and sorted by date.
   - **Update**: Updates record where `id = transaction_id`.
   - **Delete**: Deletes record where `id = transaction_id`.

5. **Monthly Budgets**:
   - Stores monthly spending ceilings in `budgets` for the specified `month` and `year`.

6. **Logout**:
   - Clears session via `supabase.auth.signOut()`.
   - Redirects to `login.html`.

---

## Testing the End-to-End Flow

1. Run the SQL in your Supabase SQL editor using `supabase-schema.sql`.
2. Open `register.html` and register a new user (e.g. `testuser@example.com` / `password123`).
3. Add transactions:
   - Food: `₹500`
   - Travel: `₹300`
   - Shopping: `₹1000`
4. Click **Sign Out**. The session is terminated and redirects to `login.html`.
5. Log in again with `testuser@example.com`.
6. Verify that the 3 transactions and monthly calculations are immediately restored from Supabase PostgreSQL!

---

## License

This project is licensed under the [MIT License](LICENSE).
