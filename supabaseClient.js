/**
 * Supabase Client & Service Integration
 * Provides persistent authentication and PostgreSQL database access with Row Level Security.
 */

const DEFAULT_SUPABASE_URL = 'https://wzdvggdksuuyfnhdlnvo.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_K9EMkQs-SUyGdofydZwjUQ_o9UyfFD9';

let supabaseClient = null;

export function getSupabaseConfig() {
  const url = (typeof window !== 'undefined' && window.__ENV__?.SUPABASE_URL) || DEFAULT_SUPABASE_URL;
  const anonKey = (typeof window !== 'undefined' && window.__ENV__?.SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

export function initSupabase() {
  if (supabaseClient) return supabaseClient;
  
  const { url, anonKey } = getSupabaseConfig();
  
  if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    });
    return supabaseClient;
  }
  
  console.warn('Supabase SDK not loaded on window. Ensure https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2 is included.');
  return null;
}

export function getClient() {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
}

// ----------------------------------------------------
// AUTHENTICATION SERVICES
// ----------------------------------------------------

export async function signUpUser({ email, password, fullName }) {
  const client = getClient();
  if (!client) throw new Error('Supabase client is not initialized');

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) throw error;

  // If user is returned and session is active, ensure profile exists
  if (data?.user) {
    try {
      await client.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        created_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('Profile upsert note:', e.message);
    }
  }

  return data;
}

export async function signInUser({ email, password }) {
  const client = getClient();
  if (!client) throw new Error('Supabase client is not initialized');

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const client = getClient();
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) console.error('Sign out error:', error.message);
}

export async function getCurrentSession() {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) return null;
  return data.session;
}

export async function getCurrentUser() {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function getUserProfile(userId) {
  const client = getClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch profiles table:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    return null;
  }
}

// ----------------------------------------------------
// TRANSACTIONS CRUD (RLS ENFORCED BY SUPABASE POSTGRES)
// ----------------------------------------------------

export async function fetchUserTransactions({ month, year, type, category, search } = {}) {
  const client = getClient();
  if (!client) throw new Error('Supabase client is not initialized');

  let query = client
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false });

  if (month && year) {
    const startMonthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${startMonthStr}-01`;
    // End of month
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${startMonthStr}-${String(lastDay).padStart(2, '0')}`;
    query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
  }

  if (type && type !== 'all') {
    query = query.eq('type', type.toLowerCase());
  }

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  if (search && search.trim()) {
    const q = search.trim();
    query = query.or(`description.ilike.%${q}%,category.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createUserTransaction({ amount, type, category, description, transactionDate, userId }) {
  const client = getClient();
  if (!client) throw new Error('Supabase client is not initialized');

  const payload = {
    user_id: userId,
    amount: parseFloat(amount),
    type: type.toLowerCase(),
    category: category || 'Other',
    description: description || '',
    transaction_date: transactionDate || new Date().toISOString().split('T')[0]
  };

  const { data, error } = await client
    .from('transactions')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserTransaction(id, { amount, type, category, description, transactionDate }) {
  const client = getClient();
  if (!client) throw new Error('Supabase client is not initialized');

  const updates = {};
  if (amount !== undefined) updates.amount = parseFloat(amount);
  if (type) updates.type = type.toLowerCase();
  if (category) updates.category = category;
  if (description !== undefined) updates.description = description;
  if (transactionDate) updates.transaction_date = transactionDate;

  const { data, error } = await client
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUserTransaction(id) {
  const client = getClient();
  if (!client) throw new Error('Supabase client is not initialized');

  const { error } = await client
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ----------------------------------------------------
// BUDGETS CRUD (RLS ENFORCED BY SUPABASE POSTGRES)
// ----------------------------------------------------

export async function fetchUserBudget({ month, year, userId }) {
  const client = getClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('budgets')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();

    if (error) {
      console.warn('Budgets query note:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    return null;
  }
}

export async function saveUserBudget({ amount, month, year, category = 'Overall', userId }) {
  const client = getClient();
  if (!client) throw new Error('Supabase client is not initialized');

  const { data, error } = await client
    .from('budgets')
    .upsert({
      user_id: userId,
      category,
      amount: parseFloat(amount),
      month: parseInt(month, 10),
      year: parseInt(year, 10)
    }, {
      onConflict: 'user_id, category, month, year'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
