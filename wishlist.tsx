import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, type Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist · Sweet Bakery" }, { name: "description", content: "Your saved Sweet Bakery favorites." }] }),
  component: WishlistPage,
});

type Row = { id: string; product: Product };

function WishlistPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);

  const { data: rows = [] } = useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, product:products(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const remove = async (id: string) => {
    await supabase.from("wishlist_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["wishlist"] });
    toast("Removed");
  };

  const moveToCart = async (p: Product) => {
    if (!user) return;
    const { data: ex } = await supabase.from("cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", p.id).maybeSingle();
    if (ex) await supabase.from("cart_items").update({ quantity: ex.quantity + 1 }).eq("id", ex.id);
    else await supabase.from("cart_items").insert({ user_id: user.id, product_id: p.id, quantity: 1 });
    toast.success(`${p.name} added to cart`);
  };

  return (
    <Layout>
      <section className="bg-rose-gradient py-16 text-center px-6">
        <Heart className="mx-auto h-8 w-8 text-primary mb-3" />
        <h1 className="font-display text-5xl text-primary">Your Wishlist</h1>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {rows.length === 0 ? (
          <div className="rounded-3xl glass p-12 text-center">
            <p className="text-muted-foreground">Your wishlist is empty.</p>
            <Button asChild variant="hero" className="mt-6"><Link to="/products">Browse products</Link></Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-col sm:flex-row gap-4 rounded-2xl bg-card p-4 shadow-card">
                <img src={r.product.image_url} alt="" className="h-32 w-full sm:w-32 rounded-xl object-cover" loading="lazy" />
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-gold">{r.product.category}</p>
                  <Link to="/product/$slug" params={{ slug: r.product.slug }} className="font-display text-xl text-primary hover:underline">
                    {r.product.name}
                  </Link>
                  <p className="mt-1 font-semibold">{formatPrice(Number(r.product.price))}</p>
                </div>
                <div className="flex sm:flex-col gap-2 sm:justify-center">
                  <Button onClick={() => moveToCart(r.product)} variant="gold" size="sm"><ShoppingBag className="h-4 w-4" /> Move to Cart</Button>
                  <Button onClick={() => remove(r.id)} variant="outline" size="sm"><Trash2 className="h-4 w-4" /> Remove</Button>
                </div>
              </div>
            ))}
            <div className="text-right pt-4">
              <Button asChild variant="hero" size="lg"><Link to="/cart">Go to Cart</Link></Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
