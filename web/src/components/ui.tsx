"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "./icons";
import { avatarColors, initialOf } from "@/lib/utils";

/* ---------------- Avatar ---------------- */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const [bg, fg] = avatarColors(name);
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size / 2.2,
        background: `linear-gradient(135deg, ${bg}, ${fg})`,
      }}
      title={name}
    >
      {initialOf(name)}
    </div>
  );
}

/* ---------------- Button ---------------- */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "gold" | "ghost" | "danger";
  size?: "sm" | "md";
  icon?: IconName;
}

export function Button({
  variant = "ghost",
  size = "md",
  icon,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn ${variant === "gold" ? "btn-gold" : variant === "danger" ? "btn-danger" : "btn-ghost"} ${size === "sm" ? "btn-sm" : ""} ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </button>
  );
}

/* ---------------- Panel ---------------- */
export function Panel({
  title,
  icon,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  icon?: IconName;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel ${className}`}>
      {title !== undefined && (
        <div className="panel-head">
          <h2>
            {icon ? (
              <span className="head-ico">
                <Icon name={icon} />
              </span>
            ) : null}
            {title}
          </h2>
          {actions ? <div className="head-actions">{actions}</div> : null}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </div>
  );
}

/* ---------------- PanelTop ---------------- */
export function PanelTop({
  title,
  icon,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  icon?: IconName;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={` ${className}`}>
      {title !== undefined && (
        <div className="flex items-center justify-between w-full rounded-t-xl gap-2.5 px-4 py-6 border-[1px] border-(--gold) bg-(--bg-3)">
          <div className="flex gap-3">
            {icon ? (
              <span className="head-ico">
                <Icon name={icon} />
              </span>
            ) : null}
            <h2>{title}</h2>
          </div>
          {actions ? <div className="">{actions}</div> : null}
        </div>
      )}
      {children}
    </div>
  );
}

/* ---------------- EmptyState ---------------- */
export function EmptyState({
  icon,
  children,
  small,
  className = "",
}: {
  icon?: IconName;
  children: ReactNode;
  small?: boolean;
  className?: string;
}) {
  return (
    <div className={`empty-state ${small ? "small" : ""} ${className}`}>
      {icon ? (
        <span className="empty-ico">
          <Icon name={icon} size={40} />
        </span>
      ) : null}
      {children}
    </div>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({
  children,
  gold,
}: {
  children: ReactNode;
  gold?: boolean;
}) {
  return (
    <span className={`badge ${gold ? "badge-gold" : ""}`}>{children}</span>
  );
}

/* ---------------- Tabs ---------------- */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="tabs">
      {options.map((o) => (
        <button
          key={o.value}
          className={`tab ${value === o.value ? "active" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Skeletons ---------------- */
export function SkeletonRows({ n = 6 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="sk-row">
          <div className="sk-av skeleton" />
          <div className="sk-ln skeleton" />
          <div className="sk-ln w60 skeleton" />
        </div>
      ))}
    </>
  );
}

/* ---------------- Toast ---------------- */
type ToastKind = "info" | "ok" | "err";
interface ToastItem {
  id: number;
  msg: string;
  kind: ToastKind;
}

const ToastCtx = createContext<{
  toast: (msg: string, kind?: ToastKind) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((msg: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, msg, kind }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3400);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-wrap">
        {items.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.kind === "ok" ? "ok" : t.kind === "err" ? "err" : ""}`}
          >
            <span className="t-ico">
              <Icon
                name={
                  t.kind === "ok"
                    ? "check"
                    : t.kind === "err"
                      ? "alert"
                      : "sparkles"
                }
                size={18}
              />
            </span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx.toast;
}