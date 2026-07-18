import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are loaded
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase environment variables are missing');
}

// We use the service role key for the bot since it needs to interact 
// with the database from the backend based on Telegram user IDs.
// RLS can still be enforced manually in services, or we bypass it and 
// rely on the services to filter by user_id.
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
