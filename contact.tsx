import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Mail, MapPin, Phone, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact · Sweet Bakery" },
      { name: "description", content: "Visit Sweet Bakery on Baker Street, call us, or send a message — we'd love to hear from you." },
      { property: "og:title", content: "Contact Sweet Bakery" },
      { property: "og:description", content: "Find us, call us, or send a message." },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(20),
  subject: z.string().trim().min(1).max(150),
  message: z.string().trim().min(1).max(1000),
});

function ContactPage() {
  const [busy, setBusy] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setTimeout(() => {
      toast.success("Message sent! We'll reply within 24h.");
      (e.target as HTMLFormElement).reset();
      setBusy(false);
    }, 600);
  };

  return (
    <Layout>
      <section className="relative bg-hero py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Say hello</p>
          <h1 className="font-display text-5xl sm:text-6xl text-primary text-glow">Contact Us</h1>
          <p className="mt-4 text-muted-foreground">We'd love to bake for you. Drop by, call, or write — we read every note.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-16 grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          {[
            { icon: User, t: "Bakery Owner", d: "Elena Moreau" },
            { icon: Phone, t: "Phone", d: "+1 (212) 555-0182" },
            { icon: Mail, t: "Email", d: "hello@sweetbakery.com" },
            { icon: MapPin, t: "Shop Address", d: "12 Baker Street, Brooklyn, NY 11201" },
            { icon: Clock, t: "Business Hours", d: "Tue – Sun · 7:00 AM – 7:00 PM" },
          ].map((c) => (
            <div key={c.t} className="flex gap-4 rounded-2xl glass p-5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold-gradient text-primary shadow-soft">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gold">{c.t}</p>
                <p className="text-foreground font-medium">{c.d}</p>
              </div>
            </div>
          ))}

          <div className="rounded-2xl overflow-hidden shadow-card aspect-[16/10]">
            <iframe
              title="Bakery location"
              src="https://www.google.com/maps?q=Baker+Street+Brooklyn&output=embed"
              className="h-full w-full border-0"
              loading="lazy"
            />
          </div>
        </div>

        <form onSubmit={onSubmit} className="rounded-3xl glass p-8 space-y-5 shadow-soft self-start">
          <h2 className="font-display text-3xl text-primary">Send us a message</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="name">Name</Label><Input id="name" name="name" required maxLength={100} /></div>
            <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required maxLength={255} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="phone">Mobile</Label><Input id="phone" name="phone" maxLength={20} /></div>
            <div><Label htmlFor="subject">Subject</Label><Input id="subject" name="subject" required maxLength={150} /></div>
          </div>
          <div><Label htmlFor="message">Message</Label><Textarea id="message" name="message" rows={5} required maxLength={1000} /></div>
          <Button type="submit" variant="hero" size="lg" disabled={busy} className="w-full">
            {busy ? "Sending…" : "Send Message"}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
