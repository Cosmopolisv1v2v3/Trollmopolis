# Cosmopolis Bot

## Setup local

```bash
cd bot
npm install
cp .env.example .env
# completa DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_DEV_GUILD_ID (tu server de pruebas),
# SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
```

## Registrar los slash commands

Cada vez que agregues o modifiques un comando, hay que volver a registrarlo:

```bash
npm run deploy-commands
```

Con `DISCORD_DEV_GUILD_ID` seteado, se registra solo en ese servidor y aparece al instante.
Sin esa variable, se registra global y tarda hasta 1 hora en propagar — usar esa modalidad
recién cuando el bot esté listo para producción.

## Correr el bot

```bash
npm start
```

## Discord Developer Portal — checklist

- [ ] **Bot → Privileged Gateway Intents**: activar `SERVER MEMBERS INTENT`.
      (`MESSAGE CONTENT INTENT` NO es necesario, todo va por slash commands.)
- [ ] **OAuth2 → URL Generator**: scopes `bot` + `applications.commands`.
      Permisos: Manage Roles, Manage Nicknames, Manage Channels, View Channels,
      Send Messages, Embed Links, Read Message History, Connect.
- [ ] Invitar al bot con el link generado.
- [ ] Subir el rol del bot por encima de "Miembro", "Alianza", los roles de fama,
      "Tesorero" y "Splits Manager" en la jerarquía del servidor.

## Primeros pasos dentro de Discord ya con el bot conectado

1. `/setup-roles` — crea los roles Tesorero y Splits Manager.
2. `/config roles miembro:@Miembro alianza:@Alianza`
3. `/config welcome canal:#bienvenida`
4. `/config contador canal:#contador-de-miembros` (canal de VOZ)
5. `/config splits canal:#splits`
6. `/config registro canal:#registros`
6. `/config fama-canal canal:#fama` — ahí se publica el embed con la info de la API y el rol de fama asignado.
7. `/config logs canal:#logs`
8. `/config albion-guild nombre:"Cosmopolis"` — resuelve la región automáticamente.
9. `/config fama-agregar etiqueta:"Novato" min:0 max:50000000 rol:@Novato` (repetir por tramo).
10. `/actualizarfama` (o `/actualizarfama usuario:@usuario` si sos staff) — re-consulta la API y ajusta el rol de fama.
11. `/pagarsplitcompleto split_id:"7e5141"` (Tesorero) — descuenta a cada participante lo acreditado y marca el split como pagado.
12. `/ping` para confirmar que todo responde y la DB está conectada.

## Deploy en Railway

- Nuevo servicio → conectar este repo/carpeta `bot/`.
- Variables de entorno: las mismas del `.env` (menos `DISCORD_DEV_GUILD_ID`, dejar vacío en prod).
- Railway detecta el `Procfile` (`worker: node src/index.js`) automáticamente.
- Después del primer deploy, correr `npm run deploy-commands` una vez (localmente o vía
  un "Run Command" one-off en Railway) para registrar los comandos globalmente.
