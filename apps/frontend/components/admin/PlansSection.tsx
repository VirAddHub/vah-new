"use client";

import { useState, useEffect } from "react";
import { adminApi, apiClient } from "../../lib/apiClient";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useToast } from "../ui/use-toast";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type Plan = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price_pence: number;
  interval: "month" | "year";
  currency: string;
  features_json: string;
  active: boolean;
  vat_inclusive: boolean;
  trial_days: number;
  sort: number;
  retired_at?: string;
  created_at: string;
  updated_at: string;
};

export default function PlansSection() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Plan>>({
    name: "",
    slug: "",
    description: "",
    price_pence: 0,
    interval: "month",
    currency: "GBP",
    features_json: "[]",
    active: false,
    vat_inclusive: true,
    trial_days: 0,
    sort: 0,
  });

  const loadPlans = async () => {
    setLoading(true);
    try {
      console.log('[PlansSection] Fetching plans from /api/admin/plans...');
      const res = await apiClient.get("/api/admin/plans");
      console.log('[PlansSection] Response:', res);

      if (res.ok && res.data) {
        console.log('[PlansSection] Plans data:', res.data);
        setPlans(res.data);
      } else {
        console.error('[PlansSection] Failed to load plans:', res);
        toast({
          title: "Error",
          description: (res as any).message || "Failed to load plans",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[PlansSection] Error loading plans:', error);
      toast({
        title: "Error",
        description: "Failed to load plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreatePlan = async () => {
    try {
      const res = await apiClient.post("/api/admin/plans", formData);
      if (res.ok) {
        toast({ title: "Success", description: "Plan created successfully" });
        setShowCreateModal(false);
        resetForm();
        loadPlans();
      } else {
        toast({
          title: "Error",
          description: (res as any).message || "Failed to create plan",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create plan",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;

    try {
      const res = await apiClient.patch(`/api/admin/plans/${editingPlan.id}`, formData);
      if (res.ok) {
        toast({ title: "Success", description: "Plan updated successfully" });
        setEditingPlan(null);
        resetForm();
        loadPlans();
      } else {
        toast({
          title: "Error",
          description: (res as any).message || "Failed to update plan",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update plan",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to retire the plan "${name}"?`)) return;

    try {
      const res = await apiClient.delete(`/api/admin/plans/${id}`);
      if (res.ok) {
        toast({ title: "Success", description: "Plan retired successfully" });
        loadPlans();
      } else {
        toast({
          title: "Error",
          description: "Failed to retire plan",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to retire plan",
        variant: "destructive",
      });
    }
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      price_pence: plan.price_pence,
      interval: plan.interval,
      currency: plan.currency,
      features_json: plan.features_json,
      active: plan.active,
      vat_inclusive: plan.vat_inclusive,
      trial_days: plan.trial_days,
      sort: plan.sort,
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      price_pence: 0,
      interval: "month",
      currency: "GBP",
      features_json: "[]",
      active: false,
      vat_inclusive: true,
      trial_days: 0,
      sort: 0,
    });
  };

  const formatPrice = (pence: number, currency: string) => {
    const amount = pence / 100;
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plans Management</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage subscription plans
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        >
          Create New Plan
        </Button>
      </div>

      {/* Plans Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trial Days</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No plans found
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{plan.slug}</code>
                    </TableCell>
                    <TableCell>{formatPrice(plan.price_pence, plan.currency)}</TableCell>
                    <TableCell className="capitalize">{plan.interval}</TableCell>
                    <TableCell>
                      {plan.retired_at ? (
                        <Badge variant="secondary">Retired</Badge>
                      ) : plan.active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>{plan.trial_days} days</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(plan)}
                        >
                          Edit
                        </Button>
                        {!plan.retired_at && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePlan(plan.id, plan.name)}
                          >
                            Retire
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPlan) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</CardTitle>
              <CardDescription>
                {editingPlan ? "Update plan details" : "Add a new subscription plan"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Professional Plan"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g., professional-monthly"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Plan description"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_pence">Price (pence) *</Label>
                  <Input
                    id="price_pence"
                    type="number"
                    value={formData.price_pence}
                    onChange={(e) =>
                      setFormData({ ...formData, price_pence: parseInt(e.target.value) || 0 })
                    }
                    placeholder="999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interval">Interval *</Label>
                  <Select
                    value={formData.interval}
                    onValueChange={(value: "month" | "year") =>
                      setFormData({ ...formData, interval: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    placeholder="GBP"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trial_days">Trial Days</Label>
                  <Input
                    id="trial_days"
                    type="number"
                    value={formData.trial_days}
                    onChange={(e) =>
                      setFormData({ ...formData, trial_days: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort">Sort Order</Label>
                  <Input
                    id="sort"
                    type="number"
                    value={formData.sort}
                    onChange={(e) =>
                      setFormData({ ...formData, sort: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="features">Features (JSON array)</Label>
                <Textarea
                  id="features"
                  value={formData.features_json}
                  onChange={(e) => setFormData({ ...formData, features_json: e.target.value })}
                  placeholder='["Feature 1", "Feature 2"]'
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="vat_inclusive"
                    checked={formData.vat_inclusive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, vat_inclusive: checked })
                    }
                  />
                  <Label htmlFor="vat_inclusive">VAT Inclusive</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPlan(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={editingPlan ? handleUpdatePlan : handleCreatePlan}>
                  {editingPlan ? "Update Plan" : "Create Plan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
