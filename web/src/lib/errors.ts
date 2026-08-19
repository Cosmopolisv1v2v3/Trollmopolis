/**
 * Traduce errores crudos de Supabase/PostgREST/Postgres a mensajes amigables
 * para el usuario, sin filtrar detalles internos (nombres de tablas,
 * constraints, esquemas). Si no hay match, devuelve un mensaje genérico.
 */
export function friendlyError(raw: string | null | undefined): string {
  const msg = (raw ?? "").toLowerCase();

  if (!msg) return "Ocurrió un error inesperado. Volvé a intentarlo.";

  if (msg.includes("duplicate") || msg.includes("already exists") || msg.includes("23505"))
    return "Ese registro ya existe. Probá con otro nombre o ID.";

  if (msg.includes("unique constraint") || msg.includes("violates unique"))
    return "Ese registro ya existe. Probá con otro nombre o ID.";

  if (msg.includes("not found") || msg.includes("no existe") || msg.includes("no rows") || msg.includes("p0001"))
    return "No encontramos ese registro. Revisá los datos e intentá de nuevo.";

  if (msg.includes("permission") || msg.includes("privilege") || msg.includes("rls"))
    return "No tenés permisos para hacer eso.";

  if (msg.includes("foreign key") || msg.includes("23503"))
    return "Ese registro está vinculado a otro y no se puede modificar.";

  if (msg.includes("check constraint") || msg.includes("23514") || msg.includes("no puede ser"))
    return "Los datos no son válidos. Revisá los campos e intentá de nuevo.";

  if (msg.includes("not registered") || msg.includes("registrado")
    || msg.includes("debés registrarte") || msg.includes("formá parte del gremio"))
    return "Todavía no estás registrado en el gremio. Usá /registrar en Discord.";

  if (msg.includes("invalid input") || msg.includes("syntax"))
    return "Los datos no son válidos. Revisá lo que ingresaste.";

  if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("network") || msg.includes("econnrefused"))
    return "El servidor tardó demasiado en responder. Probá de nuevo en unos segundos.";

  if (msg.includes("too many") || msg.includes("rate limit") || msg.includes("429"))
    return "Estás haciendo demasiadas consultas. Esperá un momento y volvé a intentarlo.";

  if (msg.includes("balance") || msg.includes("saldo") || msg.includes("insuficiente"))
    return "El saldo no alcanza para esa operación.";

  return "Ocurrió un error. Volvé a intentarlo y, si sigue, avisá a un administrador.";
}

/** Envuelve el resultado de una action: error amigable o datos. */
export interface ActionResult<T = unknown> {
  ok: boolean;
  error: string | null;
  data?: T;
}