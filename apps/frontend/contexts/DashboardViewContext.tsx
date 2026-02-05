'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface DashboardViewContextType {
    isMobileSidebarOpen: boolean;
    setIsMobileSidebarOpen: (open: boolean) => void;
}

const DashboardViewContext = createContext<DashboardViewContextType | undefined>(undefined);

export function DashboardViewProvider({ children }: { children: ReactNode }) {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <DashboardViewContext.Provider value={{ isMobileSidebarOpen, setIsMobileSidebarOpen }}>
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
