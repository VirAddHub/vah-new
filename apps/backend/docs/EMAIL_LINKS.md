# Email CTA Links (Deep-Link Map)

All CTAs should pass a **relative path** as `cta_path` (preferred) so recipients who aren't logged in go to **/login → redirect to the page**.

| Purpose                         | `cta_path`           | Where it lands (after login)  |
|---------------------------------|----------------------|--------------------------------|
| Go to Billing                   | `/billing`           | Billing overview               |
| Update Payment Method           | `/billing#payment`   | Billing (payment method)       |
| Manage Subscription             | `/billing#plan`      | Billing (plan)                 |
| View Invoices                   | `/billing#invoices`  | Billing (invoices)             |
| Finish KYC                      | `/profile`           | Profile (reverify card)        |
| View Dashboard                  | `/dashboard`         | Main dashboard                 |
| View Mail List                  | `/mail`              | Inbox                          |
| View Forwarding                 | `/forwarding`        | Forwarding requests            |
| Pricing Page (public)           | `/pricing`           | Pricing                        |
| How it Works (public)           | `/how-it-works`      | How it Works                   |

> Optional: pass `cta_url` to override with a fully-qualified URL (e.g. external status page). Otherwise, `cta_path` is recommended.

## Using in Postmark
Add a `{{action_url}}` or `{{cta_url}}` variable in your template and send like:
```js
await sendTemplateEmail(user.email, 'billing-reminder', {
  name: user.first_name || user.email,
  cta_path: '/billing', // this becomes /login?next=/billing
  // OR: cta_url: 'https://status.virtualaddresshub.co.uk'
});
```
