'use client';

import { ForwardingConfirmationModal } from '@/components/ForwardingConfirmationModal';
import type { DashboardUserProfile, MailItem } from './types';

interface ForwardingModalProps {
    isOpen: boolean;
    mailItem: MailItem | null;
    userProfile: DashboardUserProfile | null;
    onConfirm: (paymentMethod: 'monthly' | 'gocardless') => Promise<void>;
    onClose: () => void;
}

export function ForwardingModal({ isOpen, mailItem, userProfile, onConfirm, onClose }: ForwardingModalProps) {
    if (!isOpen || !mailItem) return null;
    return (
        <ForwardingConfirmationModal
            isOpen={isOpen}
            onClose={onClose}
            mailItem={mailItem}
            userProfile={userProfile}
            onConfirm={onConfirm}
        />
    );
}


