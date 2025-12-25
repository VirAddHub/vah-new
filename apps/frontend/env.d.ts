/// <reference types="next" />
/// <reference types="next/types/global" />

declare namespace NodeJS {
    interface ProcessEnv {
        NEXT_PUBLIC_API_URL?: string;
        NEXT_PUBLIC_FEATURE_GOCARDLESS?: "true" | "false";
        NEXT_PUBLIC_FEATURE_SUMSUB?: "true" | "false";
    }
}

interface Window {
    gtag?: (...args: any[]) => void;
}
