import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Dumbbell,
  Flower2,
  GraduationCap,
  Heart,
  House,
  Leaf,
  Megaphone,
  Moon,
  Scale,
  Sun,
  Target,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Category, ColorKey, IconKey, Place } from "@/lib/routine/model";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function useNow(mounted: boolean) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    if (!mounted) return;
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 20000);
    return () => window.clearInterval(id);
  }, [mounted]);
  return now;
}

const ICONS: Record<IconKey, typeof Sun> = {
  school: GraduationCap,
  scale: Scale,
  flower: Flower2,
  megaphone: Megaphone,
  utensils: Utensils,
  dumbbell: Dumbbell,
  moon: Moon,
  users: Users,
  house: House,
  bus: Bus,
  book: BookOpen,
  heart: Heart,
  sun: Sun,
  target: Target,
};

export function CatIcon({ name, className }: { name: IconKey; className?: string }) {
  const Icon = ICONS[name] ?? Leaf;
  return <Icon className={className} aria-hidden="true" />;
}

export const CAT_STYLE: Record<ColorKey, { dot: string; rail: string; bubble: string }> = {
  teach: { dot: "bg-bubble-teach-fg", rail: "border-bubble-teach-fg", bubble: "bg-bubble-teach text-bubble-teach-fg" },
  uni: { dot: "bg-bubble-uni-fg", rail: "border-bubble-uni-fg", bubble: "bg-bubble-uni text-bubble-uni-fg" },
  spirit: { dot: "bg-bubble-spirit-fg", rail: "border-bubble-spirit-fg", bubble: "bg-bubble-spirit text-bubble-spirit-fg" },
  food: { dot: "bg-bubble-food-fg", rail: "border-bubble-food-fg", bubble: "bg-bubble-food text-bubble-food-fg" },
  gym: { dot: "bg-bubble-gym-fg", rail: "border-bubble-gym-fg", bubble: "bg-bubble-gym text-bubble-gym-fg" },
  rest: { dot: "bg-bubble-rest-fg", rail: "border-bubble-rest-fg", bubble: "bg-bubble-rest text-bubble-rest-fg" },
  family: { dot: "bg-bubble-family-fg", rail: "border-bubble-family-fg", bubble: "bg-bubble-family text-bubble-family-fg" },
  home: { dot: "bg-bubble-home-fg", rail: "border-bubble-home-fg", bubble: "bg-bubble-home text-bubble-home-fg" },
  travel: { dot: "bg-bubble-travel-fg", rail: "border-bubble-travel-fg", bubble: "bg-bubble-travel text-bubble-travel-fg" },
  study: { dot: "bg-bubble-study-fg", rail: "border-bubble-study-fg", bubble: "bg-bubble-study text-bubble-study-fg" },
  personal: { dot: "bg-bubble-personal-fg", rail: "border-bubble-personal-fg", bubble: "bg-bubble-personal text-bubble-personal-fg" },
  preach: { dot: "bg-bubble-preach-fg", rail: "border-bubble-preach-fg", bubble: "bg-bubble-preach text-bubble-preach-fg" },
};

export function Bubble({
  categoryId,
  icon,
  color,
}: {
  categoryId?: string;
  icon: IconKey;
  color: ColorKey;
}) {
  const Icon =
    categoryId === "desplazamiento" ? Car : categoryId === "profesorado" ? Briefcase : (ICONS[icon] ?? Leaf);
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", CAT_STYLE[color].bubble)}>
      <Icon className="size-4" />
    </span>
  );
}

export function categoryOf(categories: Category[], id: string) {
  return categories.find((c) => c.id === id) ?? categories[0];
}

export function placeName(places: Place[], id: string | null): string {
  if (!id) return "";
  return places.find((p) => p.id === id)?.name ?? "";
}

export function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button className="absolute inset-0 bg-ink/40" aria-label="Cerrar" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl bg-paper shadow-card sm:rounded-3xl"
      >
        <div className="flex items-start gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl leading-tight text-ink">{title}</h2>
            {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sand text-ink"
            aria-label="Cerrar panel"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-2.5 text-sm font-bold text-forest-fg disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-sand px-4 py-2.5 text-sm font-bold text-ink"
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}

export const fieldClass =
  "w-full rounded-2xl border border-line bg-paper px-3 py-2.5 text-base outline-none focus-visible:border-forest";

export function Meter({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
    </div>
  );
}
