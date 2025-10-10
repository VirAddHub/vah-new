'use client';

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, Shield, Lock, Eye, Database, CheckCircle } from "lucide-react";

interface PrivacyPolicyPageProps {
  onNavigate?: (page: string) => void;
}

export function PrivacyPolicyPage({ onNavigate }: PrivacyPolicyPageProps) {
  const go = (page: string) => onNavigate?.(page);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container-modern py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => go('home')}
              className="btn-outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-2xl font-bold">Privacy Policy</h1>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-b from-background to-muted/30">
        <div className="container-modern">
          <div className="text-center mb-16">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-hover rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-bold leading-tight text-[clamp(2rem,5vw,4rem)] text-balance mb-6">
              Privacy <span className="text-gradient">Policy</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
              Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Content */}
      <section className="section-padding">
        <div className="container-modern">
          <div className="max-w-4xl mx-auto">
            <div className="grid gap-8 md:grid-cols-2">
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Data Collection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    We collect only the information necessary to provide our virtual address service, 
                    including your name, email, business details, and verification documents.
                  </p>
                </CardContent>
              </Card>

              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Data Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Your data is used solely for service delivery, compliance verification, 
                    and communication about your account. We never sell your personal information.
                  </p>
                </CardContent>
              </Card>

              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data Storage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    All data is stored securely using industry-standard encryption. 
                    We retain your information only as long as necessary for service provision.
                  </p>
                </CardContent>
              </Card>

              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Your Rights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    You have the right to access, correct, or delete your personal data. 
                    Contact us at any time to exercise these rights.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="section-padding bg-gradient-to-b from-muted/30 to-background">
        <div className="container-modern">
          <div className="max-w-4xl mx-auto">
            <Card className="card-modern p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-success to-success/90 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">GDPR Compliant</h3>
              <p className="text-muted-foreground mb-6 text-balance">
                We are fully compliant with GDPR regulations and ICO registered. 
                Your data protection rights are fully respected.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="success" className="bg-success/20 text-success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  GDPR Compliant
                </Badge>
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  <Shield className="w-3 h-3 mr-1" />
                  ICO Registered
                </Badge>
                <Badge variant="secondary" className="bg-secondary/20 text-secondary">
                  <Lock className="w-3 h-3 mr-1" />
                  Encrypted Storage
                </Badge>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}