import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente de servidor anónimo: respeta RLS, para leer datos del usuario logueado. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // llamado desde Server Component: ignorar, la cookie se setea en el middleware
          }
        },
      },
    }
  );
}

/** Cliente de servidor con service_role: SOLO para operaciones internas seguras (ej. dar de alta un login). Nunca exponer en cliente. */
export async function createServiceClient() {
  const { createClient: createServiceClientFn } = await import("@supabase/supabase-js");
  return createServiceClientFn(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}