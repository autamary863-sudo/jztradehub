// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use fallback values for development
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://csianbopsmufkrdrsasn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaWFuYm9wc211ZmtyZHJzYXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2Mjk5NzAsImV4cCI6MjA5MDIwNTk3MH0.1oZ1Ok1PI_hP-lV7-qa1BhGcEItI59gOuseQkPkrrgI';

console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase Key exists:', !!SUPABASE_PUBLISHABLE_KEY);

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Missing Supabase environment variables!');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});