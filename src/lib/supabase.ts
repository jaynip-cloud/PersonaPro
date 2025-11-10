import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: Log the Supabase URL to help identify the database location
console.log('🔍 Supabase URL:', supabaseUrl);
console.log('🔍 Supabase URL (from env):', import.meta.env.VITE_SUPABASE_URL);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Debug: Log when Supabase client is created
console.log('✅ Supabase client created with URL:', supabaseUrl);
