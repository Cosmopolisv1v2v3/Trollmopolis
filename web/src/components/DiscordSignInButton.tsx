"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icons";

export function DiscordSignInButton({ full }: { full?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await fetch("/auth/signin", { method: "POST" });
          if (res.redirected) {
            window.location.href = res.url;
          } else {
            router.push("/login?error=No se pudo iniciar el login.");
          }
        })
      }
      className={`btn btn-gold ${full ? "btn-block" : ""}`}
    >
      <Icon name="bolt" size={17} />
      {pending ? "Redirigiendo…" : "Iniciar sesión con Discord"}
    </button>
  );
}