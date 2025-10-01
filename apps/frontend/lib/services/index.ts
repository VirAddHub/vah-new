// lib/services/index.ts
// Central export for all API services

export * from './mail.service';
export * from './forwarding.service';
export * from './billing.service';
export * from './profile.service';
export * from './kyc.service';
export * from './files.service';
export * from './admin.service';
export * from './support.service';
export * from './plans.service';
export * from './notifications.service';
export * from './email-prefs.service';
export * from './gdpr.service';
export * from './downloads.service';

// Re-export commonly used services as named exports
export { mailService } from './mail.service';
export { forwardingService } from './forwarding.service';
export { billingService } from './billing.service';
export { profileService } from './profile.service';
export { kycService } from './kyc.service';
export { filesService } from './files.service';
export { adminService } from './admin.service';
export { supportService } from './support.service';
export { plansService } from './plans.service';
export { notificationsService } from './notifications.service';
export { emailPrefsService } from './email-prefs.service';
export { gdprService } from './gdpr.service';
export { downloadsService } from './downloads.service';
