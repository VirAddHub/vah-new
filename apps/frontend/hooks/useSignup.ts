import { useState, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';

export interface SignupStep1Data {
    billing: 'monthly' | 'annual';
    price: string;
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

        try {
            // Step 1: Create user account
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
                step1Data?.price
            );

            if (!signupResponse.ok) {
                throw new Error(signupResponse.error || 'Signup failed');
            }

            console.log('✅ User account created:', signupResponse.data);

            // Step 2: Set up payment
            try {
                const paymentResponse = await fetch('/api/payments/redirect-flows', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                });

                const paymentData = await paymentResponse.json();

                if (paymentResponse.ok && paymentData.redirect_url) {
                    console.log('✅ Payment setup initiated, redirecting to:', paymentData.redirect_url);
                    // Redirect to GoCardless for payment setup
                    window.location.href = paymentData.redirect_url;
                    return; // Don't set complete yet, wait for redirect
                } else if (paymentResponse.ok && paymentData.data?.skip_payment) {
                    console.log('✅ Payment setup skipped, user account created successfully');
                    // Payment setup was skipped (GoCardless not configured)
                    // User account is created and ready to use
                } else {
                    console.warn('⚠️ Payment setup failed, but user account created:', paymentData);
                    // User account created but payment setup failed
                    // Still mark as complete so they can try payment later
                }
            } catch (paymentError) {
                console.warn('⚠️ Payment setup error, but user account created:', paymentError);
                // User account created but payment setup failed
                // Still mark as complete so they can try payment later
            }

            // If we get here, user account was created successfully
            setIsComplete(true);
            console.log('✅ Signup completed successfully');

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
    }, []);

    return {
        currentStep,
        step1Data,
        step2Data,
        isComplete,
        isLoading,
        error,
        goToStep1,
        goToStep2,
        goToStep3,
        goBack,
        completeSignup,
        resetSignup,
    };
}
