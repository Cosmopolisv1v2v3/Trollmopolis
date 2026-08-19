require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');

const ROOTS = {
  commands: path.join(__dirname, '..', 'src', 'commands'),
  events: path.join(__dirname, '..', 'src', 'events'),
  components: path.join(__dirname, '..', 'src', 'components'),
};

let ok = true;

for (const [kind, dir] of Object.entries(ROOTS)) {
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    try {
      const mod = require(path.join(dir, f));
      if (kind === 'commands') {
        if (!mod.data || typeof mod.execute !== 'function') {
          console.log(`⚠️  ${f}: falta { data, execute } (${Object.keys(mod).join(',')})`);
          ok = false;
        }
      }
      if (kind === 'events' && !mod.name) {
        console.log(`⚠️  ${f}: falta event.name`);
        ok = false;
      }
      console.log(`✅ ${kind}/${f}`);
    } catch (e) {
      console.log(`❌ ${kind}/${f}: ${e.message}`);
      ok = false;
    }
  }
}

// también chequear libs exportadas
const libs = ['albion', 'banking', 'counter', 'draftStore', 'format', 'guildSettings', 'permissions', 'register', 'splits', 'supabase'];
for (const l of libs) {
  try {
    require(path.join(__dirname, '..', 'src', 'lib', l));
    console.log(`✅ lib/${l}`);
  } catch (e) {
    console.log(`❌ lib/${l}: ${e.message}`);
    ok = false;
  }
}

console.log(ok ? '\n✅ Smoke test OK' : '\n❌ Hubo problemas');
process.exit(ok ? 0 : 1);