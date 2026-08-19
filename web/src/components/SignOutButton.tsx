"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icons";

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await fetch("/auth/signout", { method: "POST" });
          router.refresh();
          router.push("/");
        })
      }
      className="btn btn-ghost btn-sm"
    >
      <Icon name="logout" size={15} />
      {pending ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}