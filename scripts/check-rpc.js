require('dotenv').config();
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query("select proname, prosecdef from pg_proc where proname in ('create_split_rpc','adjust_split_rpc')");
  console.log(r.rows);
  await c.end();
})();