import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Teach tailwind-merge the project's named font sizes (tailwind.config.js) and colours. Without this,
// `text-body` was treated as a colour and silently removed `text-paper` from black buttons,
// leaving black text on a black button.
const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            "font-size": [{ text: ["display", "h1", "h2", "h3", "h4", "body-lg", "body", "body-sm", "label", "caption", "legal"] }],
            "text-color": [{ text: ["ink", "graphite", "slate", "line", "mist", "paper"] }],
        },
    },
})

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/** What an admin screen says when the server no longer accepts this browser's admin session. */
export const ADMIN_SESSION_GONE =
  'This browser is no longer signed in as an administrator. If you signed in to a customer account here, sign out of it and sign in again as admin. Use a private window for customer accounts.';
