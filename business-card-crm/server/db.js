const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function initDb() {
  // Supabase table is created via SQL Editor — nothing to do here
  console.log('✅ Supabase DB ready');
}

module.exports = { supabase, initDb };