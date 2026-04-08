import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns today's date as a UTC ISO-8601 date string, e.g. "2026-04-08". */
export const todayISO = () => new Date().toISOString().slice(0, 10);
