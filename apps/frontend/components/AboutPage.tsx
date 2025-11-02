'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Shield, Users, Mail, Check, Send, Loader2, Building2, Clock, Globe, Award, Heart } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function AboutPage() {
    // API Data State
    const [healthData, setHealthData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Contact Form State
    const [contactForm, setContactForm] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
        company: '',
        inquiryType: 'general'
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formSuccess, setFormSuccess] = useState(false);
    const [formError, setFormError] = useState('');

    // Load health data for company stats
    useEffect(() => {
        const loadHealthData = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get('/api/health');
                if (response.ok) {
                    setHealthData(response.data);
                }
            } catch (error) {
                console.error('Failed to load health data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadHealthData();
    }, []);

    // Handle contact form submission
    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        try {
            const response = await apiClient.post('/api/contact', contactForm);
            if (response.ok) {
                setFormSuccess(true);
                setContactForm({
                    name: '',
                    email: '',
                    subject: '',
                    message: '',
                    company: '',
                    inquiryType: 'general'
                });
            } else {
                setFormError('Failed to send message. Please try again.');
            }
        } catch (error) {
            console.error('Contact form error:', error);
            setFormError('Failed to send message. Please try again.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setContactForm(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="section-mobile bg-gradient-to-b from-background to-muted/30">
                <div className="container-mobile">
                    <div className="text-center mb-16">
                        <h1 className="text-h1 sm:text-h1-lg text-balance mb-6">
                            About <span className="text-gradient">VirtualAddressHub</span>
                        </h1>
                        <p className="text-body sm:text-body-lg text-muted-foreground max-w-3xl mx-auto text-balance">
                            We're on a mission to make UK business formation accessible, compliant, and professional for entrepreneurs worldwide.
                            Our virtual office services provide the foundation for your business success.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid gap-6 md:grid-cols-4 mb-16">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <Users className="h-8 w-8 text-white" />
                            </div>
                            <div className="text-3xl font-bold text-gradient mb-2">1000+</div>
                            <p className="text-muted-foreground">Businesses Served</p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary/90 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <Building2 className="h-8 w-8 text-white" />
                            </div>
                            <div className="text-3xl font-bold text-gradient mb-2">5+</div>
                            <p className="text-muted-foreground">Years Experience</p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <Globe className="h-8 w-8 text-white" />
                            </div>
                            <div className="text-3xl font-bold text-gradient mb-2">50+</div>
                            <p className="text-muted-foreground">Countries Served</p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-secondary to-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <Award className="h-8 w-8 text-white" />
                            </div>
                            <div className="text-3xl font-bold text-gradient mb-2">100%</div>
                            <p className="text-muted-foreground">Compliance Rate</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Story */}
            <section className="section-mobile">
                <div className="container-mobile">
                    <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
                        <div>
                            <h2 className="text-h2 sm:text-h2-lg mb-6">
                                Our <span className="text-gradient">Story</span>
                            </h2>
                            <div className="space-y-4 text-muted-foreground leading-relaxed">
                                <p>
                                    VirtualAddressHub was born from a simple observation: starting a UK business shouldn't be complicated,
                                    expensive, or require physical presence in London. As entrepreneurs ourselves, we experienced firsthand
                                    the challenges of international business formation.
                                </p>
                                <p>
                                    We built VirtualAddressHub to provide a seamless, compliant, and professional solution that allows
                                    businesses worldwide to establish a credible UK presence without the overhead of traditional office space.
                                </p>
                                <p>
                                    Today, we're proud to serve over 1000 businesses across 50+ countries, helping them navigate UK
                                    regulations while maintaining their global operations.
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="card-modern p-8">
                                <ImageWithFallback
                                    src="/images/london_office.jpg"
                                    alt="Our London office location"
                                    className="aspect-[4/3] w-full rounded-xl object-cover"
                                />
                                <div className="mt-6">
                                    <h3 className="text-h3 mb-2">Central London Location</h3>
                                    <p className="text-body text-muted-foreground">
                                        Our prestigious address in the heart of London provides your business with the credibility and
                                        professional image it deserves.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="section-mobile bg-gradient-to-b from-muted/30 to-background">
                <div className="container-mobile">
                    <div className="text-center mb-16">
                        <h2 className="text-h2 sm:text-h2-lg mb-6">
                            Our <span className="text-gradient">Values</span>
                        </h2>
                        <p className="text-body sm:text-body-lg text-muted-foreground max-w-2xl mx-auto text-balance">
                            These core principles guide everything we do and shape how we serve our clients.
                        </p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-3">
                        <Card className="card-modern p-8 text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary rounded-2xl mx-auto mb-6 flex items-center justify-center">
                                <Shield className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-h3 mb-4">Compliance First</h3>
                            <p className="text-body text-muted-foreground">
                                We ensure every service meets the highest standards of UK regulation, including the latest ECCT Act 2023 requirements.
                            </p>
                        </Card>

                        <Card className="card-modern p-8 text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary/90 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                                <Heart className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-4">Client Success</h3>
                            <p className="text-muted-foreground">
                                Your success is our success. We're committed to providing exceptional service that helps your business thrive.
                            </p>
                        </Card>

                        <Card className="card-modern p-8 text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl mx-auto mb-6 flex items-center justify-center">
                                <Clock className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-4">Efficiency</h3>
                            <p className="text-muted-foreground">
                                We streamline complex processes to save you time and effort, so you can focus on growing your business.
                            </p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Team */}
            <section className="section-mobile">
                <div className="container-mobile">
                    <div className="text-center mb-16">
                        <h2 className="text-h2 sm:text-h2-lg mb-6">
                            Meet Our <span className="text-gradient">Team</span>
                        </h2>
                        <p className="text-body sm:text-body-lg text-muted-foreground max-w-2xl mx-auto text-balance">
                            Experienced professionals dedicated to making your UK business journey smooth and successful.
                        </p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-3">
                        <Card className="card-modern p-6 text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                                <Users className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="text-h3 mb-2">Expert Team</h3>
                            <p className="text-body text-muted-foreground">
                                Our team combines deep knowledge of UK business law with modern technology to deliver exceptional service.
                            </p>
                        </Card>

                        <Card className="card-modern p-6 text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-secondary to-secondary/90 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <Award className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Certified Professionals</h3>
                            <p className="text-muted-foreground">
                                All our team members are certified and regularly trained on the latest UK regulations and compliance requirements.
                            </p>
                        </Card>

                        <Card className="card-modern p-6 text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto mb-4 flex items-center justify-center">
                                <Mail className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">24/7 Support</h3>
                            <p className="text-muted-foreground">
                                Our support team is available to help you with any questions or concerns, ensuring you're never alone in your journey.
                            </p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section className="section-padding bg-gradient-to-b from-background to-muted/30">
                <div className="container-modern">
                    <div className="text-center mb-16">
                        <h2 className="text-h2 sm:text-h2-lg mb-6">
                            Get In <span className="text-gradient">Touch</span>
                        </h2>
                        <p className="text-body sm:text-body-lg text-muted-foreground max-w-2xl mx-auto text-balance">
                            Have questions about our services? We'd love to hear from you. Send us a message and we'll respond within 24 hours.
                        </p>
                    </div>

                    <div className="max-w-2xl mx-auto">
                        <Card className="card-modern p-8">
                            {formSuccess ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-gradient-to-br from-success to-success/90 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                        <Check className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-h3 mb-2">Message Sent Successfully!</h3>
                                    <p className="text-body text-muted-foreground mb-6">
                                        Thank you for reaching out. We'll get back to you within 24 hours.
                                    </p>
                                    <Button
                                        onClick={() => setFormSuccess(false)}
                                        className="btn-primary"
                                    >
                                        Send Another Message
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleContactSubmit} className="space-y-6">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div>
                                            <Label htmlFor="name" className="text-sm font-medium mb-2 block">
                                                Full Name *
                                            </Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                value={contactForm.name}
                                                onChange={handleInputChange}
                                                required
                                                className="form-input"
                                                placeholder="Your full name"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="email" className="text-sm font-medium mb-2 block">
                                                Email Address *
                                            </Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                value={contactForm.email}
                                                onChange={handleInputChange}
                                                required
                                                className="form-input"
                                                placeholder="your@email.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div>
                                            <Label htmlFor="company" className="text-sm font-medium mb-2 block">
                                                Company Name
                                            </Label>
                                            <Input
                                                id="company"
                                                name="company"
                                                value={contactForm.company}
                                                onChange={handleInputChange}
                                                className="form-input"
                                                placeholder="Your company name"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="subject" className="text-sm font-medium mb-2 block">
                                                Subject *
                                            </Label>
                                            <Input
                                                id="subject"
                                                name="subject"
                                                value={contactForm.subject}
                                                onChange={handleInputChange}
                                                required
                                                className="form-input"
                                                placeholder="What's this about?"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="message" className="text-sm font-medium mb-2 block">
                                            Message *
                                        </Label>
                                        <Textarea
                                            id="message"
                                            name="message"
                                            value={contactForm.message}
                                            onChange={handleInputChange}
                                            required
                                            rows={6}
                                            className="form-input"
                                            placeholder="Tell us how we can help you..."
                                        />
                                    </div>

                                    {formError && (
                                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                                            <p className="text-destructive text-sm">{formError}</p>
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={formLoading}
                                        className="w-full btn-primary"
                                    >
                                        {formLoading ? (
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
        </div>
    );
}