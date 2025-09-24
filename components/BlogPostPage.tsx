"use client";

import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, Calendar, Clock, Share2 } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface BlogPostPageProps {
    slug: string;
    onNavigate?: (page: string, data?: any) => void;
    onBack?: () => void;
}

export function BlogPostPage({ slug, onNavigate, onBack }: BlogPostPageProps) {
    // Mock blog post data - in real app would fetch based on slug
    const blogPosts: Record<string, any> = {
        "what-is-a-registered-office-address": {
            title: "What is a Registered Office Address and Why Your UK Company Needs One",
            excerpt: "Every UK company must have a registered office address. Learn what it is, why it's required, and how to choose the right one for your business.",
            date: "2024-01-15",
            readTime: "5 min read",
            category: "Company Formation",
            imageUrl: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2UlMjBidWlsZGluZyUyMGlsbHVzdHJhdGlvbnxlbnwxfHx8fDE3NTc0MTE2NTV8MA&ixlib=rb-4.1.0&q=80&w=1080",
            content: `
        <p>When starting a UK company, one of the fundamental requirements is having a registered office address. This isn't just a formality – it's a legal requirement that serves several important purposes for your business.</p>
        
        <h2>What is a Registered Office Address?</h2>
        <p>A registered office address is the official address of your company as recorded with Companies House. It's where official government correspondence will be sent, and it must be a UK address where documents can be served during business hours.</p>
        
        <h2>Why is it Required?</h2>
        <p>UK law requires every company to have a registered office address for several reasons:</p>
        <ul>
          <li><strong>Legal Service:</strong> Courts and regulatory bodies need a reliable address to serve legal documents</li>
          <li><strong>Public Record:</strong> It provides transparency about where your company is based</li>
          <li><strong>Government Correspondence:</strong> HMRC, Companies House, and other agencies send important documents here</li>
          <li><strong>Statutory Books:</strong> Your company's statutory books must be kept at or near this address</li>
        </ul>
        
        <h2>Can You Use Your Home Address?</h2>
        <p>While you can use your home address as a registered office, many business owners choose not to for privacy and professional reasons. Once registered, this address becomes public information viewable by anyone on the Companies House website.</p>
        
        <h2>Benefits of a Professional Virtual Address</h2>
        <p>Using a professional virtual address service offers several advantages:</p>
        <ul>
          <li><strong>Privacy Protection:</strong> Keep your home address private</li>
          <li><strong>Professional Image:</strong> A prestigious business address enhances credibility</li>
          <li><strong>Mail Handling:</strong> Professional mail scanning and forwarding services</li>
          <li><strong>Flexibility:</strong> Easy to change if you move home</li>
        </ul>
        
        <h2>What Happens to Mail?</h2>
        <p>All official mail sent to your registered office address must be handled appropriately. This includes:</p>
        <ul>
          <li>HMRC correspondence (tax returns, investigations, etc.)</li>
          <li>Companies House documents (annual returns, notices, etc.)</li>
          <li>Legal documents and court papers</li>
          <li>General business correspondence</li>
        </ul>
        
        <h2>Compliance Requirements</h2>
        <p>Your registered office address must:</p>
        <ul>
          <li>Be a physical UK address (not a PO Box)</li>
          <li>Be accessible during normal business hours</li>
          <li>Have someone available to receive documents</li>
          <li>Be kept up to date with Companies House</li>
        </ul>
        
        <h2>Choosing the Right Service</h2>
        <p>When selecting a virtual address service, consider:</p>
        <ul>
          <li><strong>Location:</strong> A prestigious address can enhance your business image</li>
          <li><strong>Services:</strong> Mail scanning, forwarding, and notification options</li>
          <li><strong>Compliance:</strong> Ensure the provider is HMRC supervised and compliant</li>
          <li><strong>Support:</strong> UK-based customer service for assistance</li>
        </ul>
        
        <h2>Conclusion</h2>
        <p>A registered office address is more than just a legal requirement – it's an important part of your business infrastructure. Whether you choose to use your home address or invest in a professional virtual address service, ensure it meets your business needs and compliance requirements.</p>
        
        <p>For businesses looking to establish a professional presence in London while maintaining privacy and compliance, a virtual address service can provide the perfect solution.</p>
      `
        },
        "uk-company-formation-complete-guide": {
            title: "UK Company Formation: A Complete Guide for 2024",
            excerpt: "Step-by-step guide to forming a UK company, including required documents, costs, and timeline. Everything you need to know to get started.",
            date: "2024-01-10",
            readTime: "8 min read",
            category: "Business Setup",
            imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHBsYW5uaW5nJTIwaWxsdXN0cmF0aW9ufGVufDF8fHx8MTc1NzQxMTY1NXww&ixlib=rb-4.1.0&q=80&w=1080",
            content: `
        <p>Starting a UK company has never been easier, but understanding the process and requirements is crucial for success. This comprehensive guide covers everything you need to know about UK company formation in 2024.</p>
        
        <h2>Types of UK Companies</h2>
        <p>Before starting, choose the right company structure:</p>
        <ul>
          <li><strong>Private Limited Company (Ltd):</strong> Most common choice for small businesses</li>
          <li><strong>Public Limited Company (PLC):</strong> For larger companies planning to go public</li>
          <li><strong>Limited Liability Partnership (LLP):</strong> Popular with professional services</li>
          <li><strong>Community Interest Company (CIC):</strong> For social enterprises</li>
        </ul>
        
        <h2>Required Information</h2>
        <p>To incorporate a UK company, you'll need:</p>
        
        <h3>Company Details</h3>
        <ul>
          <li>Company name (must be unique and compliant)</li>
          <li>Registered office address (must be UK address)</li>
          <li>Nature of business (SIC codes)</li>
          <li>Share capital and shareholding structure</li>
        </ul>
        
        <h3>Director Information</h3>
        <ul>
          <li>Full name and date of birth</li>
          <li>Service address</li>
          <li>Nationality and country of residence</li>
          <li>Other directorships (past 5 years)</li>
        </ul>
        
        <h3>Shareholder Details</h3>
        <ul>
          <li>Full name and address</li>
          <li>Number and class of shares</li>
          <li>Amount paid for shares</li>
        </ul>
        
        <h2>Step-by-Step Process</h2>
        
        <h3>Step 1: Choose Company Name</h3>
        <p>Your company name must be unique and not conflict with existing companies. Check availability on the Companies House website and ensure it complies with naming rules.</p>
        
        <h3>Step 2: Appoint Directors</h3>
        <p>Every company needs at least one director who is 16 or over. Directors can be individuals or corporate entities, but at least one must be a natural person.</p>
        
        <h3>Step 3: Set Up Registered Office</h3>
        <p>This must be a UK address where official documents can be served. Consider using a professional virtual address service for privacy and credibility.</p>
        
        <h3>Step 4: Create Share Structure</h3>
        <p>Decide on share capital, number of shares, and shareholding. The minimum share capital is £1, but consider future funding needs.</p>
        
        <h3>Step 5: Prepare Incorporation Documents</h3>
        <p>You'll need:</p>
        <ul>
          <li>Memorandum of Association</li>
          <li>Articles of Association</li>
          <li>Form IN01 (application for registration)</li>
        </ul>
        
        <h3>Step 6: Submit Application</h3>
        <p>File with Companies House online or by post. Online applications are processed faster and cost less.</p>
        
        <h2>Costs Involved</h2>
        <ul>
          <li><strong>Companies House fee:</strong> £12 (online) or £40 (postal)</li>
          <li><strong>Virtual address service:</strong> £10-50 per month</li>
          <li><strong>Professional formation service:</strong> £50-200</li>
          <li><strong>Bank account opening:</strong> Often free for new companies</li>
        </ul>
        
        <h2>Timeline</h2>
        <ul>
          <li><strong>Online applications:</strong> Usually same day</li>
          <li><strong>Postal applications:</strong> 8-10 days</li>
          <li><strong>Bank account opening:</strong> 1-3 weeks</li>
          <li><strong>HMRC registration:</strong> Immediate online</li>
        </ul>
        
        <h2>Post-Incorporation Tasks</h2>
        <p>Once your company is incorporated:</p>
        <ul>
          <li>Open a business bank account</li>
          <li>Register for Corporation Tax with HMRC</li>
          <li>Set up accounting software</li>
          <li>Consider VAT registration if needed</li>
          <li>Get business insurance</li>
          <li>Issue share certificates</li>
        </ul>
        
        <h2>Common Mistakes to Avoid</h2>
        <ul>
          <li>Using inappropriate company names</li>
          <li>Not understanding director responsibilities</li>
          <li>Inadequate share structure planning</li>
          <li>Forgetting ongoing compliance requirements</li>
          <li>Not keeping proper records</li>
        </ul>
        
        <h2>Ongoing Compliance</h2>
        <p>Remember, company formation is just the beginning. You'll need to:</p>
        <ul>
          <li>File annual accounts</li>
          <li>Submit confirmation statements</li>
          <li>Maintain statutory books</li>
          <li>Pay Corporation Tax</li>
          <li>Keep registered office address current</li>
        </ul>
        
        <h2>Getting Professional Help</h2>
        <p>While you can incorporate a company yourself, consider professional help for:</p>
        <ul>
          <li>Complex share structures</li>
          <li>Tax planning advice</li>
          <li>Ongoing compliance support</li>
          <li>Virtual address services</li>
        </ul>
        
        <p>With proper planning and understanding of the requirements, UK company formation is straightforward and can be completed quickly and affordably.</p>
      `
        }
    };

    const post = blogPosts[slug];

    if (!post) {
        return (
            <div className="min-h-screen bg-background py-24">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="font-serif text-4xl lg:text-5xl tracking-tight mb-6">Blog Post Not Found</h1>
                    <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">The blog post you're looking for doesn't exist.</p>
                    <Button onClick={onBack} variant="outline" className="px-6 py-3">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Blog
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Back Button */}
                <div className="mb-12">
                    <Button variant="outline" onClick={onBack} className="px-6 py-2">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Blog
                    </Button>
                </div>

                {/* Article Header */}
                <article className="max-w-4xl mx-auto">
                    <header className="mb-16">
                        <Badge variant="secondary" className="mb-6 px-3 py-1">{post.category}</Badge>
                        <h1 className="font-serif text-4xl lg:text-6xl tracking-tight mb-8 text-foreground leading-tight">
                            {post.title}
                        </h1>

                        <div className="flex items-center gap-6 text-muted-foreground mb-12">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                <span className="text-base">
                                    {new Date(post.date).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                <span className="text-base">{post.readTime}</span>
                            </div>
                            <Button variant="ghost" size="sm" className="ml-auto">
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                            </Button>
                        </div>

                        {/* Featured Image */}
                        <div className="relative rounded-xl overflow-hidden shadow-lg mb-16">
                            <ImageWithFallback
                                src={post.imageUrl}
                                alt={post.title}
                                className="w-full h-80 lg:h-96 object-cover"
                            />
                        </div>
                    </header>

                    {/* Article Content */}
                    <div className="prose prose-xl max-w-none mb-16" style={{
                        color: 'hsl(var(--foreground))',
                        maxWidth: 'none'
                    }}>
                        <div
                            dangerouslySetInnerHTML={{ __html: post.content }}
                            style={{
                                fontSize: '1.125rem',
                                lineHeight: '1.8',
                                color: 'hsl(var(--foreground))'
                            }}
                        />
                    </div>

                    {/* Call to Action */}
                    <Card className="mb-16 bg-primary text-primary-foreground border-0 shadow-lg">
                        <CardContent className="p-12 text-center">
                            <h3 className="font-serif text-3xl lg:text-4xl tracking-tight mb-6">Ready to Get Started?</h3>
                            <p className="text-lg mb-8 text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
                                Get your professional London business address and start building your UK company today.
                            </p>
                            <Button variant="secondary" size="lg" onClick={() => onNavigate?.('signup')} className="px-8 py-3">
                                Secure My London Address
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Related Articles */}
                    <section>
                        <h3 className="font-serif text-3xl lg:text-4xl tracking-tight mb-10 text-foreground">Related Articles</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {Object.entries(blogPosts)
                                .filter(([key]) => key !== slug)
                                .slice(0, 2)
                                .map(([key, relatedPost]) => (
                                    <Card key={key} className="hover:shadow-lg transition-all duration-300 cursor-pointer border-0 bg-card" onClick={() => onNavigate?.('blog-post', { slug: key })}>
                                        <div className="relative h-56">
                                            <ImageWithFallback
                                                src={relatedPost.imageUrl}
                                                alt={relatedPost.title}
                                                className="w-full h-full object-cover rounded-t-lg"
                                            />
                                        </div>
                                        <CardContent className="p-8">
                                            <Badge variant="secondary" className="mb-4 px-3 py-1">{relatedPost.category}</Badge>
                                            <h4 className="font-serif text-xl lg:text-2xl tracking-tight mb-4 line-clamp-2 leading-tight">{relatedPost.title}</h4>
                                            <p className="text-muted-foreground line-clamp-3 leading-relaxed">{relatedPost.excerpt}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                        </div>
                    </section>
                </article>
            </div>
        </div>
    );
}
