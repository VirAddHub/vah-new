"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: wire to your API route when ready
      // await fetch("/api/contact", { method: "POST", body: JSON.stringify(form) });
      alert("Message sent (placeholder).");
      setForm({ name: "", email: "", subject: "", message: "" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Contact us</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input placeholder="Name" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} required />
            <Input type="email" placeholder="Email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} required />
            <Input placeholder="Subject" value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })} />
            <Textarea placeholder="Message" value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })} rows={6} required />
            <Button type="submit" disabled={loading}>{loading ? "Sending..." : "Send message"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
