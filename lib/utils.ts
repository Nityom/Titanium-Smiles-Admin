import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: string | number | undefined | null): string => {
  if (date === undefined || date === null || date === '') return '';
  // Handle numeric epoch timestamps (as number or numeric string)
  const ts = typeof date === 'number' ? date : /^\d{10,}$/.test(String(date)) ? Number(date) : NaN;
  const d = isNaN(ts) ? new Date(date as string) : new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
