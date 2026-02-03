'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type DashboardView = 'mail' | 'forwarding' | null;

interface DashboardViewContextType {
    activeView: DashboardView;
    setActiveView: (view: DashboardView) => void;
    isMobileSidebarOpen: boolean;
    setIsMobileSidebarOpen: (open: boolean) => void;
}

const DashboardViewContext = createContext<DashboardViewContextType | undefined>(undefined);

export function DashboardViewProvider({ children }: { children: ReactNode }) {
    const [activeView, setActiveView] = useState<DashboardView>('mail'); // Default to mail
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <DashboardViewContext.Provider value={{ activeView, setActiveView, isMobileSidebarOpen, setIsMobileSidebarOpen }}>
            {children}
        </DashboardViewContext.Provider>
    );
}

export function useDashboardView() {
    const context = useContext(DashboardViewContext);
    if (context === undefined) {
        throw new Error('useDashboardView must be used within a DashboardViewProvider');
    }
    return context;
}
