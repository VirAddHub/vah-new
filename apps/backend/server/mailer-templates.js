// server/mailer-templates.js
// Email template functions for GoCardless webhooks

/**
 * Send invoice email to user
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.first_name - User first name
 * @param {number} params.amountPennies - Invoice amount in pence
 * @param {string} params.periodStart - Period start date
 * @param {string} params.periodEnd - Period end date
 * @param {string} params.oneTimeToken - Invoice download token
 */
async function emailInvoiceSent({ to, first_name, amountPennies, periodStart, periodEnd, oneTimeToken }) {
  console.log('📧 Invoice email:', {
    to,
    first_name,
    amountPennies,
    periodStart,
    periodEnd,
    oneTimeToken
  });

  // TODO: Integrate with actual email service (Postmark)
  // For now, just log the email details
  return { ok: true, message: 'Email logged (stub implementation)' };
}

module.exports = {
  emailInvoiceSent
};
