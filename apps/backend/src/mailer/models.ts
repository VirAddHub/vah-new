export function buildPasswordResetModel(opts: { firstName?: string; resetUrl: string; ttlMinutes: number }) {
  return {
    first_name: opts.firstName ?? "",
    reset_url: opts.resetUrl,
    ttl_minutes: opts.ttlMinutes, // Template shows "link expires in {{ttl_minutes}} minutes"
  };
}
