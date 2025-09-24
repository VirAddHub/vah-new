'use client';

import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Eye, EyeOff, Shield, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "@/lib/api-client";

type Role = 'admin' | 'user';

interface LoginProps {
  onSuccess?: (role: Role) => void;     // optional override (e.g., set state not navigate)
  onNavigate?: (page: string) => void;  // forgot/signup handlers (optional)
}

export default function Login({ onSuccess, onNavigate }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, createDemoSession } = useAuth();

  // Helper to discover role after login (via whoami)
  const fetchRole = async (): Promise<Role> => {
    try {
      const res = await fetch('/api/auth/whoami', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch session');
      const data = await res.json();
      const role = (data?.role || data?.user?.role || 'user') as Role;
      return role === 'admin' ? 'admin' : 'user';
    } catch (error) {
      console.warn('Whoami endpoint not available, defaulting to user role:', error);
      // default to user if unknown
      return 'user';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      // DEMO handy paths (keep if you still want them)
      if (email === 'demo@example.com' && password === 'demo123') {
        createDemoSession('user');
        const role: Role = 'user';
        onSuccess ? onSuccess(role) : window.location.assign('/dashboard');
        return;
      }
      if (email === 'admin@virtualaddresshub.co.uk' && password === 'admin123') {
        createDemoSession('admin');
        const role: Role = 'admin';
        onSuccess ? onSuccess(role) : window.location.assign('/admin');
        return;
      }

            // Real auth - call your actual API
            const response = await apiClient.login(email, password);

            if (!response.ok) {
              throw new Error(response.error || 'Login failed');
            }

            // Determine role from user data
            const role: Role = response.data?.user?.is_admin ? 'admin' : 'user';
      
      if (onSuccess) {
        onSuccess(role);
      } else {
        window.location.assign(role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <div className="flex-1" />
          </div>
          <CardTitle className="flex items-center gap-2 justify-center">
            <Shield className="h-5 w-5 text-primary" />
            Sign in
          </CardTitle>
          <p className="text-muted-foreground">
            Sign in to your VirtualAddressHub account
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Login"}
            </Button>
          </form>

          {/* Demo creds (optional) */}
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Demo credentials:</p>
            <p className="text-xs text-muted-foreground">User — demo@example.com / demo123</p>
            <p className="text-xs text-muted-foreground">Admin — admin@virtualaddresshub.co.uk / admin123</p>
          </div>

          <div className="mt-6 space-y-2 text-center">
            <p>
              <button
                type="button"
                onClick={() => onNavigate?.('reset-password')}
                className="text-primary hover:underline text-sm"
              >
                Forgot password?
              </button>
            </p>
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => onNavigate?.('signup')}
                className="text-primary hover:underline"
              >
                Create account
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
