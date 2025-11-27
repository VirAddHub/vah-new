"use client";

import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Search,
  Loader2,
  Clipboard,
  ClipboardCheck,
} from "lucide-react";

type UserResult = {
  id: number;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
};

type AdminUserSearchResponse = {
  ok: boolean;
  data?: Array<{
    id: number;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    email?: string;
  }>;
};

const formatUkDate = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
};

const sanitiseTag = (tag: string) =>
  tag
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9\-_]/g, "");

export default function FilenameGeneratorPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [tag, setTag] = useState("");
  const [copied, setCopied] = useState(false);

  const datePart = useMemo(() => formatUkDate(), []);

  const filename = useMemo(() => {
    if (!selectedUser) return "";
    const safeTag = sanitiseTag(tag);
    const namePart = safeTag ? `_${safeTag}` : "";
    return `user${selectedUser.id}_${datePart}${namePart}`;
  }, [selectedUser, tag, datePart]);

  const searchUsers = async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/bff/admin/users/search?query=${encodeURIComponent(
          query.trim()
        )}`,
        { credentials: "include" }
      );
      const json: AdminUserSearchResponse = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setResults(
          json.data.map((u) => ({
            id: u.id,
            first_name: u.first_name,
            last_name: u.last_name,
            company_name: u.company_name,
            email: u.email,
          }))
        );
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("User search failed", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!filename) return;
    await navigator.clipboard.writeText(filename);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-semibold">Mail Filename Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate the official scanning filename:
          <br />
          <code className="text-xs bg-muted px-2 py-1 rounded">
            user{"{ID}"}_{`{DD-MM-YY}`}_{`{TAG}`}
          </code>
        </p>
      </div>

      <div className="space-y-2">
        <Label>User Search</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Search by user name, company name, email or ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchUsers()}
          />
          <Button onClick={searchUsers} className="min-w-[80px]">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="border rounded-md mt-2 divide-y bg-card shadow-sm">
            {results.map((u) => (
              <button
                key={u.id}
                className="w-full text-left px-4 py-3 hover:bg-accent transition"
                onClick={() => {
                  setSelectedUser(u);
                  setResults([]);
                }}
              >
                <div className="font-medium text-sm">
                  {u.company_name ||
                    `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim()}
                </div>
                <div className="text-xs text-muted-foreground">
                  ID: {u.id}
                  {u.email ? ` • ${u.email}` : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="p-5 border rounded-xl bg-card space-y-4 shadow-sm">
          <div>
            <h2 className="font-medium text-lg">Selected User</h2>
            <p className="text-sm text-muted-foreground">
              {`${selectedUser.first_name ?? ""} ${
                selectedUser.last_name ?? ""
              }`.trim() || "Unnamed user"}
            </p>
            {selectedUser.company_name && (
              <p className="text-sm text-muted-foreground">
                {selectedUser.company_name}
              </p>
            )}
            {selectedUser.email && (
              <p className="text-xs text-muted-foreground">
                {selectedUser.email}
              </p>
            )}
            <p className="text-xs mt-1">User ID: {selectedUser.id}</p>
          </div>

          <div>
            <Label>Mail Tag</Label>
            <Input
              placeholder="HMRC, BANK, DVLA, Other..."
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Will be auto-converted to uppercase with no symbols.
            </p>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="p-5 border rounded-xl bg-card shadow-sm space-y-3">
          <Label>Generated Filename</Label>
          <div className="flex items-center gap-2">
            <Input value={filename} readOnly className="font-mono" />
            <Button
              onClick={copyToClipboard}
              variant="secondary"
              className="min-w-[50px]"
            >
              {copied ? (
                <ClipboardCheck className="w-4 h-4 text-green-600" />
              ) : (
                <Clipboard className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste this into your scanner filename before uploading.
          </p>
        </div>
      )}
    </div>
  );
}

