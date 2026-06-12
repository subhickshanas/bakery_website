import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, type Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Heart, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", params.slug)
      .maybeSingle();
    if (error) throw error;
    return { product: data as Product | null };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    return {
      meta: [
        { title: p ? `${p.name} · Sweet Bakery` : "Product · Sweet Bakery" },
        { name: "description", content: p?.description ?? "Hand-crafted bakery treat." },
        { property: "og:title", content: p?.name ?? "Sweet Bakery" },
        { property: "og:description", content: p?.description ?? "" },
        ...(p ? [{ property: "og:image", content: p.image_url }] : []),
      ],
    };
  },
  component: ProductDetails,
  notFoundComponent: () => <Layout><div className="p-20 text-center">Product not found.</div></Layout>,
  errorComponent: () => <Layout><div className="p-20 text-center">Couldn't load product.</div></Layout>,
});

function ProductDetails() {
  const { product } = Route.useLoaderData();
  const { user } = useAuth();
  const nav = useNavigate();
  const [qty, setQty] = useState(1);

  const { data: related = [] } = useQuery({
    queryKey: ["related", product?.category, product?.id],
    enabled: !!product,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("category", product!.category)
        .neq("id", product!.id)
        .limit(4);
      return (data ?? []) as Product[];
    },
  });

  if (!product) return <Layout><div className="p-20 text-center">Product not found.</div></Layout>;

  const requireAuth = () => {
    if (!user) {
      toast.error("Please sign in first");
      nav({ to: "/login" });
      return false;
    }
    return true;
  };

  const addToCart = async () => {
    if (!requireAuth() || !user) return;
    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();
    if (existing) {
      await supabase.from("cart_items").update({ quantity: existing.quantity + qty }).eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({ user_id: user.id, product_id: product.id, quantity: qty });
    }
    toast.success(`Added ${qty} × ${product.name} to cart`);
  };

  const buyNow = async () => {
    if (!requireAuth()) return;
    await addToCart();
    nav({ to: "/checkout" });
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <Link to="/products" className="text-sm text-muted-foreground hover:text-primary">← Back to products</Link>

        <div className="mt-6 grid gap-12 lg:grid-cols-2">
          <div className="img-zoom rounded-3xl overflow-hidden shadow-soft bg-muted aspect-square">
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold">{product.category}</p>
            <h1 className="mt-2 font-display text-4xl sm:text-5xl text-primary">{product.name}</h1>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-3xl font-semibold text-primary">{formatPrice(product.price)}</span>
              {product.original_price && (
                <span className="text-lg line-through text-muted-foreground">{formatPrice(product.original_price)}</span>
              )}
            </div>

            <p className="mt-6 text-foreground/80 leading-relaxed">{product.description}</p>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center rounded-full border border-border bg-card">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-3 hover:text-primary" aria-label="Decrease">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-semibold">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="p-3 hover:text-primary" aria-label="Increase">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <span className="text-sm text-muted-foreground">
                Total <span className="font-semibold text-foreground">{formatPrice(product.price * qty)}</span>
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={addToCart} variant="outline" size="lg"><ShoppingBag className="h-4 w-4" /> Add to Cart</Button>
              <Button onClick={buyNow} variant="hero" size="lg"><Zap className="h-4 w-4" /> Buy Now</Button>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl glass p-5">
                <h3 className="font-display text-lg text-primary mb-2">Ingredients</h3>
                <ul className="text-sm text-foreground/80 space-y-1">
                  {product.ingredients.map((i: string) => <li key={i}>· {i}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl glass p-5">
                <h3 className="font-display text-lg text-primary mb-2">Nutrition</h3>
                <ul className="text-sm text-foreground/80 space-y-1">
                  {Object.entries(product.nutrition).map(([k, v]) => (
                    <li key={k} className="flex justify-between"><span className="capitalize">{k}</span><span>{String(v)}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-24">
            <h2 className="font-display text-3xl text-primary mb-8">You may also love</h2>
            <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
