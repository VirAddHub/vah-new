/**
 * Temporary testing switches. Each one must be OFF before real customers use the service.
 *
 * KYC_AUTO_APPROVE_FOR_TESTING=true
 *   Identity verification is approved immediately, without Sumsub, when a signed-in customer starts
 *   it, and new test customers created in the admin area start approved. For testing the journey
 *   end to end before launch. Remove the variable (or set it to anything else) to turn it off.
 */
export function kycAutoApproveForTesting(): boolean {
    return (process.env.KYC_AUTO_APPROVE_FOR_TESTING || '').trim().toLowerCase() === 'true';
}
