const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.'
  );
}

// El bot SIEMPRE usa la service_role key: se salta RLS a propósito,
// porque la validación de permisos (admin, tesorero, splits manager)
// se hace contra los roles reales de Discord, no contra Postgres.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
);

module.exports = { supabase };
