'use client';

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, ShieldCheck, FileCheck, CheckCircle, AlertCircle } from "lucide-react";

interface KYCPolicyPageProps {
  onNavigate?: (page: string) => void;
}

export function KYCPolicyPage({ onNavigate }: KYCPolicyPageProps) {
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
            <h1 className="text-2xl font-bold">KYC Policy</h1>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-b from-background to-muted/30">
        <div className="container-modern">
          <div className="text-center mb-16">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-bold leading-tight text-[clamp(2rem,5vw,4rem)] text-balance mb-6">
              Know Your Customer <span className="text-gradient">Policy</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
              We are required to verify the identity of all our customers to comply with UK regulations and prevent fraud.
            </p>
          </div>
        </div>
      </section>

      {/* KYC Content */}
      <section className="section-padding">
        <div className="container-modern">
          <div className="max-w-4xl mx-auto">
            <div className="grid gap-8 md:grid-cols-2">
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Required Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      Valid passport or driving license
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      Proof of address (utility bill)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      Business registration documents
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Verification Process
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      Document authenticity check
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      Identity verification
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      Business legitimacy check
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Notice */}
      <section className="section-padding bg-gradient-to-b from-muted/30 to-background">
        <div className="container-modern">
          <div className="max-w-4xl mx-auto">
            <Card className="card-modern p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-warning to-warning/90 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Regulatory Compliance</h3>
              <p className="text-muted-foreground mb-6 text-balance">
                We are required by UK law to verify the identity of all customers. 
                This helps prevent money laundering and ensures compliance with HMRC regulations.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="warning" className="bg-warning/20 text-warning">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  AML Compliant
                </Badge>
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  <FileCheck className="w-3 h-3 mr-1" />
                  HMRC Supervised
                </Badge>
                <Badge variant="secondary" className="bg-secondary/20 text-secondary">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  UK Regulations
                </Badge>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}