require('dotenv').config();
const { supabase } = require('../src/lib/supabase');

(async () => {
  for (const table of [
    'guild_settings',
    'users',
    'wallets',
    'splits',
    'split_participants',
    'transactions',
    'split_adjustments',
    'fame_tier_roles',
  ]) {
    const { data, error } = await supabase.from(table).select('*').limit(10);
    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${data.length} filas`);
      if (data.length) console.log(JSON.stringify(data, null, 2));
    }
  }
})();