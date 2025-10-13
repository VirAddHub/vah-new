"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ChevronDown, Activity, TrendingUp, FileText } from "lucide-react";

interface MonitoringDropdownProps {
    activeSection: string;
    onSectionChange: (section: string) => void;
}

export function MonitoringDropdown({ activeSection, onSectionChange }: MonitoringDropdownProps) {
    const [open, setOpen] = useState(false);

    const monitoringItems = [
        { id: "web-vitals", label: "Web Vitals", icon: <TrendingUp className="h-4 w-4" /> },
        { id: "service-monitoring", label: "Service Monitoring", icon: <Activity className="h-4 w-4" /> },
        { id: "bundle-analysis", label: "Bundle Analysis", icon: <FileText className="h-4 w-4" /> },
    ];

    const isMonitoringActive = monitoringItems.some(item => item.id === activeSection);
    const activeItem = monitoringItems.find(item => item.id === activeSection);

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={isMonitoringActive ? "default" : "ghost"}
                    size="sm"
                    className="gap-1.5 h-8 px-3"
                >
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">Monitoring</span>
                    <ChevronDown className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                {monitoringItems.map((item) => (
                    <DropdownMenuItem
                        key={item.id}
                        onClick={() => {
                            onSectionChange(item.id);
                            setOpen(false);
                        }}
                        className="gap-2"
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
