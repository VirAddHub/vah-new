/// <reference types="next" />
/// <reference types="next/types/global" />

declare namespace NodeJS {
    interface ProcessEnv {
        NEXT_PUBLIC_API_URL?: string;
    }
}

interface Window {
    gtag?: (...args: any[]) => void;
}
