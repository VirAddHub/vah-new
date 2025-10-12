'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { getToken } from '@/lib/token-manager';

// API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

interface BlogPostForm {
    slug: string;
    title: string;
    description: string;
    content: string;
    tags: string[];
    status: 'draft' | 'published';
}

export function SimpleBlogEditor() {
    const [formData, setFormData] = useState<BlogPostForm>({
        slug: '',
        title: '',
        description: '',
        content: '',
        tags: [],
        status: 'draft'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('');

        try {
            // Create MDX content with frontmatter
            const frontmatter = `---
title: "${formData.title}"
description: "${formData.description}"
date: "${new Date().toISOString()}"
updated: "${new Date().toISOString()}"
tags: [${formData.tags.map(tag => `"${tag}"`).join(', ')}]
cover: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2UlMjBidWlsZGluZyUyMGlsbHVzdHJhdGlvbnxlbnwxfHx8fDE3NTc0MTE2NTV8MA&ixlib=rb-4.1.0&q=80&w=1080"
status: "${formData.status}"
ogTitle: "${formData.title}"
ogDesc: "${formData.description}"
noindex: false
---

${formData.content}`;

            // Send to backend to create MDX file
            const token = getToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/api/admin/blog/posts`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                    slug: formData.slug,
                    title: formData.title,
                    description: formData.description,
                    content: formData.content,
                    tags: formData.tags,
                    status: formData.status,
                    cover: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2UlMjBidWlsZGluZyUyMGlsbHVzdHJhdGlvbnxlbnwxfHx8fDE3NTc0MTE2NTV8MA&ixlib=rb-4.1.0&q=80&w=1080",
                    ogTitle: formData.title,
                    ogDesc: formData.description,
                    noindex: false
                })
            });

            const result = await response.json();

            if (result.ok) {
                setMessage('✅ Blog post created successfully!');
                // Reset form
                setFormData({
                    slug: '',
                    title: '',
                    description: '',
                    content: '',
                    tags: [],
                    status: 'draft'
                });
            } else {
                setMessage(`❌ Error: ${result.error || 'Failed to create post'}`);
            }
        } catch (error) {
            setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addTag = (tag: string) => {
        if (tag && !formData.tags.includes(tag)) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, tag]
            }));
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Create Blog Post</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="slug">Slug (URL-friendly)</Label>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                    placeholder="my-blog-post"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value: 'draft' | 'published') =>
                                        setFormData(prev => ({ ...prev, status: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="My Amazing Blog Post"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="A brief description of your blog post..."
                                rows={3}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="content">Content (Markdown)</Label>
                            <Textarea
                                id="content"
                                value={formData.content}
                                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="# My Blog Post

This is the content of my blog post. You can use **markdown** formatting.

## Subheading

- Bullet points
- More content"
                                rows={15}
                                required
                            />
                        </div>

                        <div>
                            <Label>Tags</Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {formData.tags.map(tag => (
                                    <span
                                        key={tag}
                                        className="bg-primary/10 text-primary px-2 py-1 rounded-md text-sm flex items-center gap-1"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => removeTag(tag)}
                                            className="text-primary/70 hover:text-primary"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add a tag"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addTag(e.currentTarget.value);
                                            e.currentTarget.value = '';
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        const input = document.querySelector('input[placeholder="Add a tag"]') as HTMLInputElement;
                                        if (input?.value) {
                                            addTag(input.value);
                                            input.value = '';
                                        }
                                    }}
                                >
                                    Add Tag
                                </Button>
                            </div>
                        </div>

                        {message && (
                            <div className={`p-3 rounded-md ${message.startsWith('✅')
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                                }`}>
                                {message}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full"
                        >
                            {isSubmitting ? 'Creating Post...' : 'Create Blog Post'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
