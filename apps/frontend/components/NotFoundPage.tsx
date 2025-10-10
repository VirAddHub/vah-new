'use client';

import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Home, ArrowLeft, Search, HelpCircle } from "lucide-react";

interface NotFoundPageProps {
  onNavigate?: (page: string) => void;
}

export function NotFoundPage({ onNavigate }: NotFoundPageProps) {
  const go = (page: string) => onNavigate?.(page);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="card-modern p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-muted to-muted/50 rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Search className="h-10 w-10 text-muted-foreground" />
          </div>
          
          <h1 className="text-4xl font-bold mb-4 text-gradient">404 - Page Not Found</h1>
          
          <p className="text-lg text-muted-foreground mb-8 text-balance">
            Sorry, the page you're looking for doesn't exist. 
            It might have been moved, deleted, or you entered the wrong URL.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => go('home')}
              className="btn-primary"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="btn-outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Button
              onClick={() => go('help')}
              variant="outline"
              className="btn-outline"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Get Help
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}