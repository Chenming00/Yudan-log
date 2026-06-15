import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 把 Date 格式化为 <input type="datetime-local"> 需要的本地 `YYYY-MM-DDTHH:mm` */
export function toLocalDatetimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[`~!@#$%^&*()+=,[\]{}\\|;:'",.<>/?]/g, '')
    .replace(/\s+/g, '-');
}
