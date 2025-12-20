import { useState, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';

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
                step1Data?.price,
                step2Data.isSoleController,
                step2Data.additionalControllersCount
            );

            if (!signupResponse.ok) {
                // Handle EMAIL_EXISTS with friendly message
                if (signupResponse.errorCode === 'EMAIL_EXISTS' || signupResponse.error === 'email_exists') {
                    throw new Error('An account already exists with this email. Please log in or reset your password.');
                }
                throw new Error(signupResponse.error || 'Signup failed');
            }

            console.log('✅ User account created:', signupResponse.data);

            // Step 2: Set up payment
            // IMPORTANT: Call the backend API (not a same-origin Next.js route)
            // This requires that signup stored a token/cookie.
            const paymentBody: any = {
                billing_period: step1Data?.billing ?? 'monthly',
            };
            if (step1Data?.plan_id) paymentBody.plan_id = step1Data.plan_id;

            const paymentResp = await apiClient.post<any>('/api/payments/redirect-flows', paymentBody);

            // Ensure paymentResp exists and has the expected shape
            if (!paymentResp) {
                throw new Error('Payment setup failed: No response from server');
            }

            // Handle already linked case
            if (paymentResp.ok && (paymentResp as any)?.data?.alreadyLinked) {
                console.log('✅ Payment method already linked');
                setIsComplete(true);
                return;
            }

            // Handle resume case
            if (paymentResp.ok && (paymentResp as any)?.data?.resume) {
                const redirectFlowId = (paymentResp as any)?.data?.redirectFlowId;
                console.log('✅ Resuming payment setup with flow:', redirectFlowId);
                // Redirect to billing page with flow ID to complete
                const appUrl = window.location.origin;
                window.location.href = `${appUrl}/billing?billing_request_flow_id=${encodeURIComponent(redirectFlowId)}`;
                return;
            }

            const redirectUrl =
                (paymentResp as any)?.redirect_url ||
                (paymentResp as any)?.data?.redirect_url;

            if (paymentResp.ok && redirectUrl) {
                console.log('✅ Payment setup initiated, redirecting to:', redirectUrl);
                // Store flag to show welcome message after GoCardless redirect
                sessionStorage.setItem('show_welcome_after_payment', 'true');
                window.location.href = redirectUrl;
                return; // Don't set complete yet, wait for redirect
            }

            if (paymentResp.ok && (paymentResp as any)?.data?.skip_payment) {
                // Payment setup was skipped (GoCardless not configured). Only in this case can we "complete" signup.
                setIsComplete(true);
                console.log('✅ Signup completed (payment skipped)');
                return;
            }

            // If payment setup fails, do NOT mark signup complete (service is not live without a mandate).
            const errorMsg = (paymentResp as any)?.error?.message ||
                (paymentResp as any)?.message ||
                (paymentResp as any)?.error ||
                'Payment setup failed. Please try again.';
            throw new Error(errorMsg);

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
