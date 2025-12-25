"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MonitoringDropdown } from "@/components/admin/MonitoringDropdown";
import { VAHLogo } from "@/components/VAHLogo";
import { Clipboard, Download, LogOut, Menu, Receipt, X } from "lucide-react";

type MenuItem = { id: string; label: string; icon: ReactNode };

interface AdminHeaderProps {
  onNavigate?: (page: string, data?: any) => void;
  menuItems: readonly MenuItem[];
  activeSection: string;
  onSelectSection: (section: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onLogout: () => void;
  onGoInvoices: () => void;
  onGoFilenameGenerator: () => void;
}

export function AdminHeader({
  onNavigate,
  menuItems,
  activeSection,
  onSelectSection,
  mobileMenuOpen,
  setMobileMenuOpen,
  onLogout,
  onGoInvoices,
  onGoFilenameGenerator,
}: AdminHeaderProps) {
  return (
    <header className="bg-card border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo and Branding */}
        <VAHLogo onNavigate={onNavigate} size="md" />

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Admin navigation">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "primary" : "ghost"}
              size="sm"
              onClick={() => onSelectSection(item.id)}
              className="gap-1.5 h-8 px-3"
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </Button>
          ))}

          <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-3" onClick={onGoInvoices}>
            <Receipt className="h-4 w-4" />
            <span className="text-sm">Invoices</span>
          </Button>

          <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-3" onClick={onGoFilenameGenerator}>
            <Clipboard className="h-4 w-4" />
            <span className="text-sm">Filename Generator</span>
          </Button>

          <MonitoringDropdown activeSection={activeSection} onSectionChange={onSelectSection} />
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-8 w-8 p-0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          {/* Quick Actions - Desktop Only */}
          <div className="hidden lg:flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Sign out</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "primary" : "ghost"}
                size="sm"
                onClick={() => {
                  onSelectSection(item.id);
                  setMobileMenuOpen(false);
                }}
                className="justify-start gap-2 h-8 text-xs"
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </Button>
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="justify-start gap-2 h-8 text-xs col-span-2"
              onClick={() => {
                onGoInvoices();
                setMobileMenuOpen(false);
              }}
            >
              <Receipt className="h-4 w-4" />
              <span className="truncate">Invoices</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="justify-start gap-2 h-8 text-xs col-span-2"
              onClick={() => {
                onGoFilenameGenerator();
                setMobileMenuOpen(false);
              }}
            >
              <Clipboard className="h-4 w-4" />
              <span className="truncate">Filename Generator</span>
            </Button>

            <div className="col-span-2">
              <MonitoringDropdown
                activeSection={activeSection}
                onSectionChange={(section) => {
                  onSelectSection(section);
                  setMobileMenuOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}


