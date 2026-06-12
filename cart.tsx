import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, type Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart · Sweet Bakery" }, { name: "description", content: "Review your cart and proceed to checkout." }] }),
  component: CartPage,
});

type Row = { id: string; quantity: number; product: Product };

function CartPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["cart", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, quantity, product:products(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const total = rows.reduce((s, r) => s + r.quantity * Number(r.product.price), 0);

  const update = async (id: string, q: number) => {
    if (q < 1) return;
    await supabase.from("cart_items").update({ quantity: q }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["cart"] });
  };
  const remove = async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["cart"] });
    toast("Removed from cart");
  };

  return (
    <Layout>
      <section className="bg-hero py-16 text-center px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Shopping</p>
        <h1 className="font-display text-5xl text-primary text-glow">Your Cart</h1>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-12 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {!isLoading && rows.length === 0 && (
            <div className="rounded-3xl glass p-12 text-center">
              <p className="text-muted-foreground">Your cart is empty.</p>
              <Button asChild variant="hero" className="mt-6"><Link to="/products">Start shopping</Link></Button>
            </div>
          )}
          {rows.map((r) => (
            <div key={r.id} className="flex gap-4 rounded-2xl bg-card p-4 shadow-card">
              <img src={r.product.image_url} alt="" className="h-24 w-24 rounded-xl object-cover" loading="lazy" />
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-gold">{r.product.category}</p>
                <h3 className="font-display text-lg text-primary truncate">{r.product.name}</h3>
                <p className="text-sm text-muted-foreground">{formatPrice(Number(r.product.price))}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-border">
                    <button onClick={() => update(r.id, r.quantity - 1)} className="p-2"><Minus className="h-3 w-3" /></button>
                    <span className="w-8 text-center text-sm">{r.quantity}</span>
                    <button onClick={() => update(r.id, r.quantity + 1)} className="p-2"><Plus className="h-3 w-3" /></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatPrice(r.quantity * Number(r.product.price))}</span>
                    <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-3xl glass p-6 h-fit space-y-4 sticky top-24">
          <h2 className="font-display text-2xl text-primary">Order Summary</h2>
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatPrice(total)}</span></div>
          <div className="flex justify-between text-sm"><span>Delivery</span><span className="text-gold">Free</span></div>
          <div className="h-px bg-border" />
          <div className="flex justify-between font-display text-lg"><span>Total</span><span>{formatPrice(total)}</span></div>
          <Button asChild variant="hero" size="lg" className="w-full" disabled={rows.length === 0}>
            <Link to="/checkout">Checkout</Link>
          </Button>
          <Button asChild variant="outline" className="w-full"><Link to="/products">Continue shopping</Link></Button>
        </aside>
      </div>
    </Layout>
  );
}
