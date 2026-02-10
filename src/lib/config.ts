/// <reference types="vite/client" />

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
    console.error('CRITICAL: Supabase credentials missing in .env.local');
}

export const supabaseConfig = {
    url: url || '',
    anonKey: anonKey || ''
};
