"use client";

import { useEffect, useState } from "react";
import ProductDisplay from "@/components/products/product-display";
import { getProducts } from "@/lib/actions/product.action";
import { Product } from "@/lib/domains/products.domain";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const result = await getProducts(1000);
        setProducts((result.data as unknown as Product[]) || []);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Welcome to our E-commerce Platform
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Discover amazing products from our sellers
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading products...</div>
      ) : (
        <ProductDisplay products={products as unknown as Product[]} />
      )}
    </main>
  );
}
