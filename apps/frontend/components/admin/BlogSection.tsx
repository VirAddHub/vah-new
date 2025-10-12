"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { getToken } from '@/lib/token-manager';
import {
    Filter,
    Plus,
    Eye,
    Edit,
    Trash2,
    Search,
    FileText,
    Clock,
    CheckCircle,
    AlertCircle,
    Calendar,
    Tag,
    Image,
    Save,
    X,
    ExternalLink,
} from "lucide-react";
import { apiClient, safe } from "../../lib/apiClient";
import { useAuthedSWR } from "../../lib/useAuthedSWR";
import { SimpleBlogEditor } from "./SimpleBlogEditor";

// API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

interface BlogPost {
    slug: string;
    title: string;
    description: string;
    date: string;
    updated?: string;
    tags: string[];
    cover?: string;
    status: 'draft' | 'published';
    ogTitle?: string;
    ogDesc?: string;
    noindex: boolean;
    content: string;
    excerpt: string;
}

const logAdminAction = async (action: string, data?: any) => {
    try {
        await apiClient.post('/api/audit/admin-action', {
            action,
            data,
            timestamp: new Date().toISOString(),
            adminId: null
        });
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
};

export function BlogSection() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [tagFilter, setTagFilter] = useState('all');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
    const [formData, setFormData] = useState({
        slug: '',
        title: '',
        description: '',
        content: '',
        tags: [] as string[],
        cover: '',
        status: 'draft' as 'draft' | 'published',
        ogTitle: '',
        ogDesc: '',
        noindex: false
    });

    // Fetch blog posts
    const { data: postsData, error: postsError, mutate: refetchPosts } = useAuthedSWR<{ ok: boolean; data: BlogPost[] }>(
        '/api/admin/blog/posts?includeDrafts=true'
    );

    // Fetch categories/tags
    const { data: categoriesData } = useAuthedSWR<{ ok: boolean; data: string[] }>(
        '/api/admin/blog/categories'
    );

    const posts = postsData?.data || [];
    const categories = categoriesData?.data || [];

    // Filter posts
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                post.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                post.content.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
            const matchesTag = tagFilter === 'all' || post.tags.includes(tagFilter);

            return matchesSearch && matchesStatus && matchesTag;
        });
    }, [posts, searchTerm, statusFilter, tagFilter]);

    const handleCreatePost = async () => {
        try {
            const token = getToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/api/admin/blog/posts`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            const json = await response.json().catch(() => ({}));

            if (!json?.ok) {
                console.error('[create-post] failed', { status: response.status, json });
                alert(`Failed to create post: ${json?.error ?? `HTTP ${response.status}`}`);
                return;
            }

            const { slug, status } = json.data || {};
            await logAdminAction('blog_post_created', { slug: formData.slug, title: formData.title });

            // Revalidate blog pages to show new post
            try {
                await fetch('/api/revalidate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-revalidate-secret': process.env.NEXT_PUBLIC_REVALIDATE_SECRET || ''
                    },
                    body: JSON.stringify({ tag: 'blog', slug: formData.slug })
                });
            } catch (revalidateError) {
                console.warn('Failed to revalidate blog pages:', revalidateError);
            }

            await refetchPosts();
            setShowCreateForm(false);
            resetForm();
            alert('Blog post created successfully!');
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post. Please try again.');
        }
    };

    const handleUpdatePost = async () => {
        if (!editingPost) return;

        try {
            const token = getToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/api/admin/blog/posts/${editingPost.slug}`, {
                method: 'PUT',
                headers,
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            const json = await response.json().catch(() => ({}));

            if (!json?.ok) {
                console.error('[update-post] failed', { status: response.status, json });
                alert(`Failed to update post: ${json?.error ?? `HTTP ${response.status}`}`);
                return;
            }

            await logAdminAction('blog_post_updated', { slug: editingPost.slug, title: formData.title });

            // Revalidate blog pages to show updated post
            try {
                await fetch('/api/revalidate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-revalidate-secret': process.env.NEXT_PUBLIC_REVALIDATE_SECRET || ''
                    },
                    body: JSON.stringify({ tag: 'blog', slug: editingPost.slug })
                });
            } catch (revalidateError) {
                console.warn('Failed to revalidate blog pages:', revalidateError);
            }

            await refetchPosts();
            setEditingPost(null);
            resetForm();
            alert('Blog post updated successfully!');
        } catch (error) {
            console.error('Error updating post:', error);
            alert('Failed to update post. Please try again.');
        }
    };

    const handleDeletePost = async (slug: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const token = getToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/api/admin/blog/posts/${slug}`, {
                method: 'DELETE',
                headers,
                credentials: 'include'
            });
            const json = await response.json().catch(() => ({}));

            if (!json?.ok) {
                console.error('[delete-post] failed', { status: response.status, json });
                alert(`Failed to delete post: ${json?.error ?? `HTTP ${response.status}`}`);
                return;
            }

            await logAdminAction('blog_post_deleted', { slug, title });

            // Revalidate blog pages to remove deleted post
            try {
                await fetch('/api/revalidate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-revalidate-secret': process.env.NEXT_PUBLIC_REVALIDATE_SECRET || ''
                    },
                    body: JSON.stringify({ tag: 'blog', slug })
                });
            } catch (revalidateError) {
                console.warn('Failed to revalidate blog pages:', revalidateError);
            }

            await refetchPosts();
            // Show success message
            alert('Blog post deleted successfully!');
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Failed to delete post. Please try again.');
        }
    };

    const resetForm = () => {
        setFormData({
            slug: '',
            title: '',
            description: '',
            content: '',
            tags: [],
            cover: '',
            status: 'draft',
            ogTitle: '',
            ogDesc: '',
            noindex: false
        });
    };

    const startEdit = (post: BlogPost) => {
        setEditingPost(post);
        setFormData({
            slug: post.slug,
            title: post.title,
            description: post.description || '',
            content: post.content,
            tags: post.tags,
            cover: post.cover || '',
            status: post.status,
            ogTitle: post.ogTitle || '',
            ogDesc: post.ogDesc || '',
            noindex: post.noindex
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Blog Management</h2>
                    <p className="text-muted-foreground">Manage your blog posts and content</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        New Post
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            // Create a simple blog post directly via API
                            const slug = prompt('Enter slug for the blog post:');
                            if (!slug) return;

                            const title = prompt('Enter title:');
                            if (!title) return;

                            const description = prompt('Enter description:');
                            if (!description) return;

                            const content = prompt('Enter content (markdown):');
                            if (!content) return;

                            const status = confirm('Publish immediately?') ? 'published' : 'draft';

                            // Create the post
                            const token = getToken();
                            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                            if (token) headers.Authorization = `Bearer ${token}`;

                            fetch(`${API_BASE}/api/admin/blog/posts`, {
                                method: 'POST',
                                headers,
                                credentials: 'include',
                                body: JSON.stringify({
                                    slug,
                                    title,
                                    description,
                                    content,
                                    tags: ['General'],
                                    status,
                                    cover: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2UlMjBidWlsZGluZyUyMGlsbHVzdHJhdGlvbnxlbnwxfHx8fDE3NTc0MTE2NTV8MA&ixlib=rb-4.1.0&q=80&w=1080",
                                    ogTitle: title,
                                    ogDesc: description,
                                    noindex: false
                                })
                            })
                                .then(r => r.json())
                                .then(result => {
                                    if (result.ok) {
                                        alert('✅ Blog post created successfully!');
                                        refetchPosts();
                                    } else {
                                        alert(`❌ Error: ${result.error || 'Failed to create post'}`);
                                    }
                                })
                                .catch(error => {
                                    alert(`❌ Error: ${error.message}`);
                                });
                        }}
                        className="flex items-center gap-2"
                    >
                        <FileText className="h-4 w-4" />
                        Quick Create
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="search">Search Posts</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="Search by title, description, or content..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="published">Published</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="tag">Tag</Label>
                            <Select value={tagFilter} onValueChange={setTagFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All tags" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Tags</SelectItem>
                                    {categories.map(tag => (
                                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Posts Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Blog Posts ({filteredPosts.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Tags</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPosts.map((post) => (
                                <TableRow key={post.slug}>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{post.title}</div>
                                            <div className="text-sm text-muted-foreground">{post.slug}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                                            {post.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {post.tags.slice(0, 2).map(tag => (
                                                <Badge key={tag} variant="outline" className="text-xs">
                                                    {tag}
                                                </Badge>
                                            ))}
                                            {post.tags.length > 2 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{post.tags.length - 2}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(post.date)}
                                            </div>
                                            {post.updated && (
                                                <div className="text-xs text-muted-foreground">
                                                    Updated: {formatDate(post.updated)}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => startEdit(post)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDeletePost(post.slug, post.title)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create/Edit Form Modal */}
            {(showCreateForm || editingPost) && (
                <Card className="fixed inset-4 z-50 overflow-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            {editingPost ? 'Edit Post' : 'Create New Post'}
                            <Button variant="ghost" size="sm" onClick={() => {
                                setShowCreateForm(false);
                                setEditingPost(null);
                                resetForm();
                            }}>
                                <X className="h-4 w-4" />
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            title: e.target.value,
                                            slug: prev.slug || generateSlug(e.target.value)
                                        }));
                                    }}
                                    placeholder="Enter post title"
                                />
                            </div>
                            <div>
                                <Label htmlFor="slug">Slug *</Label>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                    placeholder="post-slug"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Brief description of the post"
                                rows={3}
                            />
                        </div>

                        <div>
                            <Label htmlFor="content">Content *</Label>
                            <Textarea
                                id="content"
                                value={formData.content}
                                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="Write your blog post content here..."
                                rows={15}
                                className="font-mono text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="tags">Tags (comma-separated)</Label>
                                <Input
                                    id="tags"
                                    value={formData.tags.join(', ')}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                                    }))}
                                    placeholder="tag1, tag2, tag3"
                                />
                            </div>
                            <div>
                                <Label htmlFor="status">Status</Label>
                                <Select value={formData.status} onValueChange={(value: 'draft' | 'published') =>
                                    setFormData(prev => ({ ...prev, status: value }))
                                }>
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
                            <Label htmlFor="cover">Cover Image URL</Label>
                            <Input
                                id="cover"
                                value={formData.cover}
                                onChange={(e) => setFormData(prev => ({ ...prev, cover: e.target.value }))}
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => {
                                setShowCreateForm(false);
                                setEditingPost(null);
                                resetForm();
                            }}>
                                Cancel
                            </Button>
                            <Button onClick={editingPost ? handleUpdatePost : handleCreatePost}>
                                <Save className="h-4 w-4 mr-2" />
                                {editingPost ? 'Update Post' : 'Create Post'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
