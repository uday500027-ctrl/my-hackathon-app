"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Policy {
  id: string;
  name: string;
  enabled_categories: string[];
  custom_terms: string[];
  strictness: "relaxed" | "balanced" | "strict";
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORY_MAP: Record<string, string> = {
  email: "Email address",
  phone: "Phone number",
  aadhaar: "Aadhaar number",
  pan: "PAN",
  upi_id: "UPI ID",
  card: "Credit / debit card",
  api_key: "API keys & secrets",
  ip_address: "IP address",
  password: "Passwords",
};

const ALL_CATEGORIES = Object.keys(CATEGORY_MAP);

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  // Create / Edit modal state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [formName, setFormName] = useState("");
  const [formStrictness, setFormStrictness] = useState<"relaxed" | "balanced" | "strict">("balanced");
  const [formCategories, setFormCategories] = useState<string[]>(ALL_CATEGORIES);
  const [formCustomTerms, setFormCustomTerms] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadPolicies() {
      try {
        const res = await fetch("/api/policies");
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          setError(data.message || "Failed to load policies.");
          setLoading(false);
          return;
        }
        setPolicies(data.data || []);
        setError("");
      } catch {
        if (!ignore) {
          setError("Unable to connect to the server. Please check your connection.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadPolicies();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  function handleOpenCreate() {
    setEditingPolicy(null);
    setFormName("");
    setFormStrictness("balanced");
    setFormCategories(ALL_CATEGORIES);
    setFormCustomTerms("");
    setFormIsDefault(policies.length === 0);
    setFormError("");
    setDialogOpen(true);
  }

  function handleOpenEdit(policy: Policy) {
    setEditingPolicy(policy);
    setFormName(policy.name);
    setFormStrictness(policy.strictness);
    setFormCategories(policy.enabled_categories || []);
    setFormCustomTerms((policy.custom_terms || []).join("\n"));
    setFormIsDefault(policy.is_default);
    setFormError("");
    setDialogOpen(true);
  }

  function handleToggleCategory(category: string) {
    if (formCategories.includes(category)) {
      if (formCategories.length === 1) {
        setFormError("At least one category must be enabled.");
        return;
      }
      setFormCategories(formCategories.filter((c) => c !== category));
    } else {
      setFormCategories([...formCategories, category]);
    }
    setFormError("");
  }

  async function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!formName.trim()) {
      setFormError("Policy name is required.");
      return;
    }

    if (formCategories.length === 0) {
      setFormError("At least one category must be enabled.");
      return;
    }

    const terms = formCustomTerms
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    for (const term of terms) {
      if (term.length < 2 || term.length > 50) {
        setFormError(`Custom term "${term}" must be between 2 and 50 characters.`);
        return;
      }
    }

    if (terms.length > 20) {
      setFormError("A maximum of 20 custom terms is allowed.");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingPolicy ? `/api/policies/${editingPolicy.id}` : "/api/policies";
      const method = editingPolicy ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          enabled_categories: formCategories,
          custom_terms: terms,
          strictness: formStrictness,
          is_default: formIsDefault,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message || "Failed to save policy.");
        setIsSubmitting(false);
        return;
      }

      setDialogOpen(false);
      startTransition(() => {
        setRefreshKey((k) => k + 1);
      });
    } catch {
      setFormError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenDelete(policy: Policy) {
    setPolicyToDelete(policy);
    setDeleteError("");
    setDeleteDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!policyToDelete) return;
    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/policies/${policyToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.message || "Failed to delete policy.");
        setIsDeleting(false);
        return;
      }

      setDeleteDialogOpen(false);
      setPolicyToDelete(null);
      startTransition(() => {
        setRefreshKey((k) => k + 1);
      });
    } catch {
      setDeleteError("Could not reach the server. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Policies
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Control which sensitive data types and custom terms PasteGuard masks.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="btn-accent self-start sm:self-auto"
        >
          New policy
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
            />
          ))}
        </div>
      ) : policies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
            No policies found
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Create your first policy to customize data masking categories and risk strictness.
          </p>
          <Button
            onClick={handleOpenCreate}
            className="btn-accent mt-4"
          >
            Create first policy
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {policies.map((p) => {
            const customTermsCount = p.custom_terms?.length || 0;
            return (
              <Card
                key={p.id}
                className="flex flex-col justify-between border-neutral-200 bg-white shadow-none transition-shadow hover:shadow-xs dark:border-neutral-800 dark:bg-neutral-900"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-medium text-neutral-900 dark:text-neutral-100">
                          {p.name}
                        </CardTitle>
                        {p.is_default && (
                          <Badge
                            variant="secondary"
                            className="bg-[#2f5e3e]/10 text-[#2f5e3e] border border-[#2f5e3e]/20 text-xs font-semibold"
                          >
                            Default
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs text-neutral-500 capitalize">
                        Strictness: {p.strictness}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize text-neutral-600 dark:text-neutral-400">
                      {p.strictness}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      Enabled detectors ({p.enabled_categories?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(p.enabled_categories || []).map((cat) => (
                        <span
                          key={cat}
                          className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                        >
                          {CATEGORY_MAP[cat] || cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                    <span>
                      {customTermsCount === 0
                        ? "No custom terms"
                        : `${customTermsCount} custom term${customTermsCount === 1 ? "" : "s"}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(p)}
                        className="h-8 px-2.5 text-xs text-neutral-700 hover:text-neutral-900 dark:text-neutral-300"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={p.is_default}
                        title={p.is_default ? "Default policy cannot be deleted" : "Delete policy"}
                        onClick={() => handleOpenDelete(p)}
                        className="h-8 px-2.5 text-xs text-neutral-500 hover:text-red-600 disabled:opacity-40"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Policy Dialog (Create / Edit) ─────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSavePolicy} className="space-y-5">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {editingPolicy ? "Edit policy" : "New policy"}
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Configure deterministic masking rules and contextual evaluation parameters.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
              >
                {formError}
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="policy-name" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Policy name
                </Label>
                <Input
                  id="policy-name"
                  type="text"
                  maxLength={80}
                  placeholder="e.g., Strict External, Internal Chat..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="text-sm"
                  required
                />
              </div>

              {/* Strictness */}
              <div className="space-y-1.5">
                <Label htmlFor="policy-strictness" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Risk strictness
                </Label>
                <Select
                  value={formStrictness}
                  onValueChange={(val: "relaxed" | "balanced" | "strict") => setFormStrictness(val)}
                >
                  <SelectTrigger id="policy-strictness" className="w-full text-sm">
                    <SelectValue placeholder="Select strictness" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relaxed">Relaxed - Lower sensitivity for trusted channels</SelectItem>
                    <SelectItem value="balanced">Balanced - Standard baseline for general use</SelectItem>
                    <SelectItem value="strict">Strict - High sensitivity for public/AI destinations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Enabled Categories */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Enabled detectors
                  </Label>
                  <span className="text-[11px] text-neutral-400">
                    {formCategories.length} selected
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                  {ALL_CATEGORIES.map((cat) => {
                    const isChecked = formCategories.includes(cat);
                    return (
                      <label
                        key={cat}
                        className="flex cursor-pointer items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleCategory(cat)}
                        />
                        <span>{CATEGORY_MAP[cat]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Custom Terms */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="custom-terms" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Custom terms (one per line, max 20)
                  </Label>
                  <span className="text-[11px] text-neutral-400">
                    Project names, confidential keywords
                  </span>
                </div>
                <Textarea
                  id="custom-terms"
                  rows={3}
                  placeholder="Project Falcon&#10;Acme&#10;InternalCodeName"
                  value={formCustomTerms}
                  onChange={(e) => setFormCustomTerms(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              {/* Default Switch */}
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="space-y-0.5">
                  <Label htmlFor="is-default-switch" className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                    Set as default policy
                  </Label>
                  <p className="text-[11px] text-neutral-500">
                    This policy will be preselected for new text scans.
                  </p>
                </div>
                <Switch
                  id="is-default-switch"
                  checked={formIsDefault}
                  onCheckedChange={setFormIsDefault}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="btn-accent text-xs"
              >
                {isSubmitting ? "Saving..." : editingPolicy ? "Save changes" : "Create policy"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete Dialog ─────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Delete policy
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Are you sure you want to delete &ldquo;{policyToDelete?.name}&rdquo;? Historical scans using this policy will not be affected.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
            >
              {deleteError}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="text-xs"
            >
              {isDeleting ? "Deleting..." : "Delete policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
