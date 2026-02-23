import { useState, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';
import type { ApiError } from '../lib/http';
import { FEATURES } from '../lib/config';

export interface SignupStep1Data {
    billing: 'monthly' | 'annual';
    price: string;
    plan_id?: string;
}

export interface SignupStep2Data {
    // Contact Information
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone: string;

    // Company Details
    business_type: string;
    country_of_incorporation: string;
    company_number: string;
    company_name: string;

    // Forwarding Address
    forward_to_first_name: string;
    forward_to_last_name: string;
    address_line1: string;
    address_line2: string;
    city: string;
    postcode: string;
    forward_country: string;

    // Controllers declaration (required in UI, but optional in type to allow progressive form fill)
    isSoleController?: boolean;
    additionalControllersCount?: number | null;

    // Business owners (only required when not sole controller)
    additionalOwners?: Array<{ fullName: string; email: string }>;
    ownersPendingInfo?: boolean;
}

export interface SignupStep3Data {
    billing: 'monthly' | 'annual';
    price: string;
    step2Data: SignupStep2Data;
}

export type SignupStep = 1 | 2 | 3;

export function useSignup() {
    const [currentStep, setCurrentStep] = useState<SignupStep>(1);
    const [step1Data, setStep1Data] = useState<SignupStep1Data | null>(null);
    const [step2Data, setStep2Data] = useState<SignupStep2Data | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);

    const goToStep1 = useCallback(() => {
        setCurrentStep(1);
        setStep1Data(null);
        setStep2Data(null);
        setIsComplete(false);
    }, []);

    const goToStep2 = useCallback((data: SignupStep1Data) => {
        setStep1Data(data);
        setCurrentStep(2);
    }, []);

    const goToStep3 = useCallback((data: SignupStep2Data) => {
        setStep2Data(data);
        setCurrentStep(3);
    }, []);

    const goBack = useCallback(() => {
        if (currentStep > 1) {
            setCurrentStep((prev) => (prev - 1) as SignupStep);
        }
    }, [currentStep]);

    const completeSignup = useCallback(async () => {
        if (!step2Data) {
            setError('Missing signup data');
            return;
        }

        setIsLoading(true);
        setError(null);
        setEmailAlreadyExists(false);

        try {
            const signupResponse = await apiClient.signup(
                step2Data.email,
                step2Data.password,
                step2Data.first_name,
                step2Data.last_name,
                step2Data.phone,
                step2Data.business_type,
                step2Data.country_of_incorporation,
                step2Data.company_number,
                step2Data.company_name,
                step2Data.forward_to_first_name,
                step2Data.forward_to_last_name,
                step2Data.address_line1,
                step2Data.address_line2,
                step2Data.city,
                step2Data.postcode,
                step2Data.forward_country,
                step1Data?.billing,
                step1Data?.price,
                step2Data.isSoleController,
                step2Data.additionalControllersCount,
                step2Data.additionalOwners,
                step2Data.ownersPendingInfo
            );

            if (!signupResponse.ok) {
                const err = signupResponse as ApiError & { errorCode?: string; status?: number };
                const code = err.code ?? err.errorCode;
                const status = err.status;
                if (status === 409 && code === 'EMAIL_ALREADY_EXISTS') {
                    setEmailAlreadyExists(true);
                    setError('This email is already registered.');
                    return;
                }
                throw new Error(typeof err.message === 'string' ? err.message : (err as any).error ?? 'Signup failed. Please try again.');
            }

            console.log('✅ User account created:', signupResponse.data);

            // Account created. Embedded checkout in SignupStep3 will handle
            // payment separately by fetching a client_secret. If payments are
            // disabled, mark signup as complete immediately.
            if (!FEATURES.payments) {
                setIsComplete(true);
                console.log('✅ Signup completed (payments disabled)');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Signup failed';
            setError(errorMessage);
            console.error('❌ Signup error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [step2Data, step1Data]);

    const resetSignup = useCallback(() => {
        setCurrentStep(1);
        setStep1Data(null);
        setStep2Data(null);
        setIsComplete(false);
        setIsLoading(false);
        setError(null);
        setEmailAlreadyExists(false);
    }, []);

    return {
        currentStep,
        step1Data,
        step2Data,
        isComplete,
        isLoading,
        error,
        emailAlreadyExists,
        goToStep1,
        goToStep2,
        goToStep3,
        goBack,
        completeSignup,
        resetSignup,
    };
}
