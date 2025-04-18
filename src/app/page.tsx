import ProductDisplay from "@/components/products/product-display";
import { getProducts } from "@/lib/actions/product.action";
import { Product } from "@/lib/domains/products.domain";

export default async function Home() {
  const result = await getProducts(20);
  const products = result.data || [];

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

      {/* Pass the pre-fetched products to the client component */}
      <ProductDisplay products={products as unknown as Product[]} />
    </main>
  );
}
