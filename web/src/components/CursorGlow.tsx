"use client";

/* Cursor dorado: orbe con easing, anillo reactivo y rastro de partículas.
   Solo en dispositivos con puntero fino; el cursor nativo se mantiene visible. */
import { useEffect } from "react";

export function CursorGlow() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const orb = document.createElement("div");
    orb.className = "cursor-orb";
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    document.body.appendChild(orb);
    document.body.appendChild(ring);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let orbX = mouseX;
    let orbY = mouseY;
    let ringX = mouseX;
    let ringY = mouseY;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      const p = document.createElement("div");
      p.className = "cursor-particle";
      p.style.left = `${e.clientX}px`;
      p.style.top = `${e.clientY}px`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 800);

      const target = e.target as HTMLElement | null;
      const interactive = target?.closest?.(
        "a, button, input, select, textarea, [role='button'], [data-interactive]",
      );
      ring.classList.toggle("active", !!interactive);
    };

    const loop = () => {
      orbX += (mouseX - orbX) * 0.18;
      orbY += (mouseY - orbY) * 0.18;
      ringX += (mouseX - ringX) * 0.4;
      ringY += (mouseY - ringY) * 0.4;
      orb.style.left = `${orbX}px`;
      orb.style.top = `${orbY}px`;
      ring.style.left = `${ringX}px`;
      ring.style.top = `${ringY}px`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      orb.remove();
      ring.remove();
      document.querySelectorAll(".cursor-particle").forEach((el) => el.remove());
    };
  }, []);

  return null;
}