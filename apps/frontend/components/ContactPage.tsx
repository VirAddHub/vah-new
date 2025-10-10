'use client';

import { useState, useEffect } from "react";
import {
    Mail,
    Phone,
    Clock,
    Send,
    CheckCircle,
    Loader2,
    MapPin,
    MessageCircle,
    Calendar,
    Users,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { contactApi, supportApi } from "@/lib/apiClient";
import { isOk } from "@/types/api";

interface ContactPageProps {
    onNavigate?: (page: string) => void;
}

type InquiryType =
    | "general"
    | "pricing"
    | "technical"
    | "billing";

// For development/demo purposes, we'll use a mock endpoint
import { API_BASE } from "@/lib/config";

const CONTACT_ENDPOINT = API_BASE
    ? `${API_BASE}/api/contact`
    : "/api/contact";

export default function ContactPage({ onNavigate }: ContactPageProps) {
    // Support information state
    const [supportInfo, setSupportInfo] = useState<any>(null);
    const [loadingSupport, setLoadingSupport] = useState(true);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        company: "",
        subject: "",
        message: "",
        inquiryType: "general" as InquiryType,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState("");

    // Load support information
    useEffect(() => {
        const loadSupportInfo = async () => {
            try {
                setLoadingSupport(true);
                const response = await supportApi.get();
                if (isOk(response)) {
                    setSupportInfo(response.data);
                }
            } catch (error) {
                console.error('Failed to load support info:', error);
            } finally {
                setLoadingSupport(false);
            }
        };

        loadSupportInfo();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');
        setErrorMessage("");

        try {
            const response = await contactApi.send(formData);
            if (isOk(response)) {
                setSubmitStatus('success');
                setFormData({
                    name: "",
                    email: "",
                    company: "",
                    subject: "",
                    message: "",
                    inquiryType: "general",
                });
            } else {
                setSubmitStatus('error');
                setErrorMessage(response.error || "Failed to send message. Please try again.");
            }
        } catch (error) {
            console.error('Contact form error:', error);
            setSubmitStatus('error');
            setErrorMessage("Failed to send message. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="section-padding bg-gradient-to-b from-background to-muted/30">
                <div className="container-modern">
                    <div className="text-center mb-16">
                        <h1 className="font-bold leading-tight text-[clamp(2rem,5vw,4rem)] text-balance mb-6">
                            Get In <span className="text-gradient">Touch</span>
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
                            Have questions about our virtual address services? We're here to help. 
                            Reach out to our expert team for personalized assistance.
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact Methods */}
            <section className="section-padding">
                <div className="container-modern">
                    <div className="grid gap-8 lg:grid-cols-3 mb-16">
                        {/* Email Support */}
                        <Card className="card-modern p-8 text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-hover rounded-2xl mx-auto mb-6 flex items-center justify-center">
                                <Mail className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-4">Email Support</h3>
                            <p className="text-muted-foreground mb-6">
                                Send us a detailed message and we'll respond within 24 hours.
                            </p>
                            <div className="space-y-2">
                                <p className="font-medium">support@virtualaddresshub.com</p>
                                <p className="text-sm text-muted-foreground">General inquiries</p>
                            </div>
                        </Card>

                        {/* Phone Support */}
                        <Card className="card-modern p-8 text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary/90 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                                <Phone className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-4">Phone Support</h3>
                            <p className="text-muted-foreground mb-6">
                                Speak directly with our team during business hours.
                            </p>
                            <div className="space-y-2">
                                <p className="font-medium">+44 20 1234 5678</p>
                                <p className="text-sm text-muted-foreground">Mon-Fri, 9AM-6PM GMT</p>
                            </div>
                        </Card>

                        {/* Live Chat */}
                        <Card className="card-modern p-8 text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl mx-auto mb-6 flex items-center justify-center">
                                <MessageCircle className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-4">Live Chat</h3>
                            <p className="text-muted-foreground mb-6">
                                Get instant help from our support team online.
                            </p>
                            <Button className="btn-primary">
                                Start Chat
                            </Button>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Contact Form */}
            <section className="section-padding bg-gradient-to-b from-muted/30 to-background">
                <div className="container-modern">
                    <div className="max-w-2xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold mb-6">
                                Send Us a <span className="text-gradient">Message</span>
                            </h2>
                            <p className="text-lg text-muted-foreground text-balance">
                                Fill out the form below and we'll get back to you as soon as possible.
                            </p>
                        </div>

                        <Card className="card-modern p-8">
                            {submitStatus === 'success' ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-gradient-to-br from-success to-success/90 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                        <CheckCircle className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Message Sent Successfully!</h3>
                                    <p className="text-muted-foreground mb-6">
                                        Thank you for reaching out. We'll get back to you within 24 hours.
                                    </p>
                                    <Button
                                        onClick={() => setSubmitStatus('idle')}
                                        className="btn-primary"
                                    >
                                        Send Another Message
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div>
                                            <label htmlFor="name" className="text-sm font-medium mb-2 block">
                                                Full Name *
                                            </label>
                                            <Input
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                required
                                                className="form-input"
                                                placeholder="Your full name"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label htmlFor="email" className="text-sm font-medium mb-2 block">
                                                Email Address *
                                            </label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                required
                                                className="form-input"
                                                placeholder="your@email.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div>
                                            <label htmlFor="company" className="text-sm font-medium mb-2 block">
                                                Company Name
                                            </label>
                                            <Input
                                                id="company"
                                                name="company"
                                                value={formData.company}
                                                onChange={handleInputChange}
                                                className="form-input"
                                                placeholder="Your company name"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label htmlFor="inquiryType" className="text-sm font-medium mb-2 block">
                                                Inquiry Type
                                            </label>
                                            <select
                                                id="inquiryType"
                                                name="inquiryType"
                                                value={formData.inquiryType}
                                                onChange={handleSelectChange}
                                                className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                                            >
                                                <option value="general">General Inquiry</option>
                                                <option value="pricing">Pricing Question</option>
                                                <option value="technical">Technical Support</option>
                                                <option value="billing">Billing Question</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="subject" className="text-sm font-medium mb-2 block">
                                            Subject *
                                        </label>
                                        <Input
                                            id="subject"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleInputChange}
                                            required
                                            className="form-input"
                                            placeholder="What's this about?"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="message" className="text-sm font-medium mb-2 block">
                                            Message *
                                        </label>
                                        <Textarea
                                            id="message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleInputChange}
                                            required
                                            rows={6}
                                            className="form-input"
                                            placeholder="Tell us how we can help you..."
                                        />
                                    </div>

                                    {submitStatus === 'error' && (
                                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                                            <p className="text-destructive text-sm">{errorMessage}</p>
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full btn-primary"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Sending Message...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-4 w-4" />
                                                Send Message
                                            </>
                                        )}
                                    </Button>
                                </form>
                            )}
                        </Card>
                    </div>
                </div>
            </section>

            {/* Office Information */}
            <section className="section-padding">
                <div className="container-modern">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-6">
                            Our <span className="text-gradient">Office</span>
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
                            Visit our London office or learn more about our location.
                        </p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-2">
                        <Card className="card-modern p-8">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-hover rounded-xl flex items-center justify-center flex-shrink-0">
                                    <MapPin className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">Address</h3>
                                    <p className="text-muted-foreground">
                                        123 Business Street<br />
                                        London, EC1A 4HD<br />
                                        United Kingdom
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card className="card-modern p-8">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-secondary to-secondary/90 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Clock className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">Business Hours</h3>
                                    <div className="text-muted-foreground space-y-1">
                                        <p>Monday - Friday: 9:00 AM - 6:00 PM GMT</p>
                                        <p>Saturday: 10:00 AM - 2:00 PM GMT</p>
                                        <p>Sunday: Closed</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Support Team */}
            <section className="section-padding bg-gradient-to-b from-background to-muted/30">
                <div className="container-modern">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-6">
                            Meet Our <span className="text-gradient">Support Team</span>
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
                            Our experienced team is here to help you succeed with your UK business.
                        </p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-3">
                        <Card className="card-modern p-8 text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-hover rounded-full mx-auto mb-6 flex items-center justify-center">
                                <Users className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Customer Success</h3>
                            <p className="text-muted-foreground">
                                Dedicated team focused on helping you get the most out of our services.
                            </p>
                        </Card>

                        <Card className="card-modern p-8 text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-secondary to-secondary/90 rounded-full mx-auto mb-6 flex items-center justify-center">
                                <Calendar className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Technical Support</h3>
                            <p className="text-muted-foreground">
                                Expert technical assistance for all your platform and integration needs.
                            </p>
                        </Card>

                        <Card className="card-modern p-8 text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto mb-6 flex items-center justify-center">
                                <MessageCircle className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Account Management</h3>
                            <p className="text-muted-foreground">
                                Personal account managers for enterprise clients and complex requirements.
                            </p>
                        </Card>
                    </div>
                </div>
            </section>
        </div>
    );
}