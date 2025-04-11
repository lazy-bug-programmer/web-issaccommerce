import ProductDisplay from "@/components/products/product-display";
import { getProducts } from "@/lib/appwrite/actions/product.action";
import { Product } from "@/lib/domains/products.domain";
import AuthButtons from "@/components/layout/auth-buttons";
import PointsDisplay from "@/components/tasks/points-display";

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

      {/* Points display - centered with flex */}
      <div className="flex justify-center mb-12">
        <div className="w-full max-w-4xl">
          <PointsDisplay />
        </div>
      </div>

      {/* Pass the pre-fetched products to the client component */}
      <ProductDisplay products={products as unknown as Product[]} />

      {/* Conditionally render auth buttons based on login state */}
      <AuthButtons />
    </main>
  );
}
