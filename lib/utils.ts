import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getStatusVariant = (status: string) => {
  switch (status.toUpperCase()) {
    case "NEW":
      return "blue";
    case "IN_PROGRESS":
      return "yellow";
    case "COMPLETED":
      return "green";
    case "CANCELLED":
      return "red";
    default:
      return "secondary";
  }
};
