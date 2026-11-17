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
