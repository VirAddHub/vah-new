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

/**
 * Safely parse JSON from a Response, checking content-type first
 * Throws a clear error if response is not JSON
 */
async function parseJsonSafe(res: Response): Promise<any> {
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.toLowerCase().includes('application/json')) {
        const text = await res.text().catch(() => 'Unable to read response');
        throw new Error(`Expected JSON response, got: ${text.slice(0, 200)}`);
    }

    try {
        return await res.json();
    } catch (err) {
        const text = await res.text().catch(() => 'Unable to read response');
        throw new Error(`Failed to parse JSON response: ${text.slice(0, 200)}`);
    }
}

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
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [tagsInput, setTagsInput] = useState(''); // Comma-separated tags input
    const [page, setPage] = useState(1);
    const pageSize = 20; // Posts per page
    const [formData, setFormData] = useState({
        slug: '',
        title: '',
        description: '',
        content: '',
        tags: [] as string[],
        cover: '',
        status: 'published' as 'draft' | 'published',
        ogTitle: '',
        ogDesc: '',
        noindex: false,
        authorName: 'Liban Adan',
        authorTitle: 'Founder, VirtualAddressHub',
        authorImage: '/images/authors/liban.jpg'
    });

    // Fetch blog posts with pagination
    // useAuthedSWR handles { ok: true, items: [...], total, page, pageSize } format
    const { data: postsData, error: postsError, mutate: refetchPosts } = useAuthedSWR<{ items: BlogPost[]; total: number; page: number; pageSize: number }>(
        ['/api/bff/admin/blog/posts', { includeDrafts: 'true', page: String(page), pageSize: String(pageSize) }]
    );

    // Fetch categories/tags
    const { data: categoriesData } = useAuthedSWR<string[]>(
        '/api/bff/admin/blog/categories'
    );

    // Extract posts and pagination info
    const posts = postsData?.items || [];
    const totalPosts = postsData?.total || 0;
    const totalPages = Math.ceil(totalPosts / pageSize);
    const categories = categoriesData || [];

    // Client-side filtering (for search, status, tags)
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            const matchesSearch = !searchTerm || 
                post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                post.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                post.content?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
            const matchesTag = tagFilter === 'all' || (post.tags && post.tags.includes(tagFilter));

            return matchesSearch && matchesStatus && matchesTag;
        });
    }, [posts, searchTerm, statusFilter, tagFilter]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [searchTerm, statusFilter, tagFilter]);

    const handleCreatePost = async () => {
        try {
            // Convert comma-separated tags to array
            const tagsArray = tagsInput
                .split(',')
                .map(t => t.trim())
                .filter(Boolean);

            const token = getToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await fetch('/api/bff/admin/blog/posts/create', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                    ...formData,
                    tags: tagsArray
                })
            });

            let data: any;
            try {
                data = await parseJsonSafe(response);
            } catch (err: any) {
                console.error('[create-post] Blog request failed with non-JSON response:', err);
                alert(`Failed to create post: ${err.message || 'Invalid response from server'}`);
                return;
            }

            if (!response.ok || !data?.ok) {
                console.error('[create-post] failed', { status: response.status, data });
                alert(`Failed to create post: ${data?.error || `HTTP ${response.status}`}`);
                return;
            }

            const { slug, status } = data.data || {};
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
            // Convert comma-separated tags to array
            const tagsArray = tagsInput
                .split(',')
                .map(t => t.trim())
                .filter(Boolean);

            const token = getToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await fetch(`/api/bff/admin/blog/posts/${editingPost.slug}`, {
                method: 'PATCH',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                    ...formData,
                    tags: tagsArray
                })
            });

            let data: any;
            try {
                data = await parseJsonSafe(response);
            } catch (err: any) {
                console.error('[update-post] Blog request failed with non-JSON response:', err);
                alert(`Failed to update post: ${err.message || 'Invalid response from server'}`);
                return;
            }

            if (!response.ok || !data?.ok) {
                console.error('[update-post] failed', { status: response.status, data });
                alert(`Failed to update post: ${data?.error || `HTTP ${response.status}`}`);
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

            const response = await fetch(`/api/bff/admin/blog/posts/${slug}`, {
                method: 'DELETE',
                headers,
                credentials: 'include'
            });

            let data: any;
            try {
                data = await parseJsonSafe(response);
            } catch (err: any) {
                console.error('[delete-post] Blog request failed with non-JSON response:', err);
                alert(`Failed to delete post: ${err.message || 'Invalid response from server'}`);
                return;
            }

            if (!response.ok || !data?.ok) {
                console.error('[delete-post] failed', { status: response.status, data });
                alert(`Failed to delete post: ${data?.error || `HTTP ${response.status}`}`);
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
            status: 'published',
            ogTitle: '',
            ogDesc: '',
            noindex: false,
            authorName: 'Liban Adan',
            authorTitle: 'Founder, VirtualAddressHub',
            authorImage: '/images/authors/liban.jpg'
        });
        setTagsInput('');
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
            noindex: post.noindex,
            authorName: (post as any).authorName || 'Liban Adan',
            authorTitle: (post as any).authorTitle || 'Founder, VirtualAddressHub',
            authorImage: (post as any).authorImage || '/images/authors/liban.jpg'
        });
        // Convert tags array to comma-separated string for input
        setTagsInput(post.tags?.join(', ') || '');
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

    async function handleCoverFileChange(
        e: React.ChangeEvent<HTMLInputElement>
    ) {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("image", file);

        setIsUploadingCover(true);
        try {
            const res = await fetch("/api/bff/admin/blog/upload", {
                method: "POST",
                body: formData,
            });

            let data: any;
            try {
                data = await parseJsonSafe(res);
            } catch (err: any) {
                console.error('[upload-cover] Blog request failed with non-JSON response:', err);
                alert(`Image upload failed: ${err.message || 'Invalid response from server'}`);
                return;
            }

            if (!res.ok || !data?.ok || !data?.data?.url) {
                console.error("Upload failed", data);
                alert(data?.message || data?.error || "Image upload failed");
                return;
            }

            // Update formData.cover with returned URL
            setFormData((prev) => ({
                ...prev,
                cover: data.data.url,
            }));
        } catch (err) {
            console.error(err);
            alert("Image upload failed");
        } finally {
            setIsUploadingCover(false);
        }
    }

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

                            fetch('/api/bff/admin/blog/posts/create', {
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
                        Blog Posts ({totalPosts > 0 ? `${filteredPosts.length} of ${totalPosts}` : filteredPosts.length})
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
                            {postsError ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-destructive">
                                        Error loading posts: {postsError.message || 'Unknown error'}
                                    </TableCell>
                                </TableRow>
                            ) : filteredPosts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        {posts.length === 0 ? (
                                            <div>
                                                <p className="text-lg font-medium mb-2">No blog posts yet</p>
                                                <p className="text-sm">Click "New Post" to create your first blog post</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-lg font-medium mb-2">No posts match your filters</p>
                                                <p className="text-sm">Try adjusting your search or filter criteria</p>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPosts.map((post) => (
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
                                                {post.tags && post.tags.length > 0 ? (
                                                    <>
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
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">No tags</span>
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
                                                    title="View post"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => startEdit(post)}
                                                    title="Edit post"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDeletePost(post.slug, post.title)}
                                                    title="Delete post"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                
                {/* Pagination */}
                {totalPosts > pageSize && (
                    <div className="border-t px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalPosts)} of {totalPosts} posts
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (page <= 3) {
                                            pageNum = i + 1;
                                        } else if (page >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = page - 2 + i;
                                        }
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={page === pageNum ? "primary" : "outline"}
                                                size="sm"
                                                onClick={() => setPage(pageNum)}
                                                className="min-w-[2.5rem]"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
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
                                    value={tagsInput}
                                    onChange={(e) => setTagsInput(e.target.value)}
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

                        <div className="space-y-2">
                            <Label htmlFor="cover">Cover Image</Label>

                            {/* File input for upload */}
                            <div className="flex items-center gap-3">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverFileChange}
                                    disabled={isUploadingCover}
                                    className="text-sm"
                                />
                                {isUploadingCover && (
                                    <span className="text-xs text-muted-foreground">Uploading…</span>
                                )}
                            </div>

                            {/* Manual URL input still available */}
                            <Input
                                id="cover"
                                type="text"
                                value={formData.cover}
                                onChange={(e) => setFormData(prev => ({ ...prev, cover: e.target.value }))}
                                placeholder="Or paste an image URL"
                            />

                            {/* Preview */}
                            {formData.cover && (
                                <div className="mt-3">
                                    <p className="mb-1 text-xs text-muted-foreground">Preview:</p>
                                    <div className="relative h-40 w-full overflow-hidden rounded-lg border border-border">
                                        <img
                                            src={formData.cover}
                                            alt="Cover preview"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Author Information */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-sm font-semibold">Author Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="authorName">Author Name</Label>
                                    <Input
                                        id="authorName"
                                        value={formData.authorName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
                                        placeholder="Liban Adan"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="authorTitle">Author Title</Label>
                                    <Input
                                        id="authorTitle"
                                        value={formData.authorTitle}
                                        onChange={(e) => setFormData(prev => ({ ...prev, authorTitle: e.target.value }))}
                                        placeholder="Founder, VirtualAddressHub"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="authorImage">Author Image URL</Label>
                                <Input
                                    id="authorImage"
                                    type="text"
                                    value={formData.authorImage}
                                    onChange={(e) => setFormData(prev => ({ ...prev, authorImage: e.target.value }))}
                                    placeholder="/images/authors/liban.jpg"
                                />
                            </div>
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
