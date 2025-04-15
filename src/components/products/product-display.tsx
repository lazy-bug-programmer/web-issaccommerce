"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import { getProductImage } from "@/lib/actions/product.action";
import { Product } from "@/lib/domains/products.domain";

// Image component that handles loading the image
function ProductImage({
  imageId,
  productName,
}: {
  imageId: string;
  productName: string;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchImage = async () => {
      try {
        // Call getProductImage but within useEffect
        const response = await getProductImage(imageId);

        if (!isMounted) return;

        if (response.error || !response.data?.file) {
          setError("Failed to load image");
          setIsLoading(false);
          return;
        }

        const buffer = response.data.file;
        const blob = new Blob([buffer]);
        const url = URL.createObjectURL(blob);

        setImageUrl(url);
        setIsLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading image:", err);
        setError("Error loading image");
        setIsLoading(false);
      }
    };

    if (imageId) {
      fetchImage();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageId]);

  if (isLoading) {
    return (
      <div className="aspect-square w-full bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="aspect-square w-full bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400">{error || "No image"}</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={productName}
      className="h-full w-full object-cover"
    />
  );
}

// Main component that receives products from server component
export default function ProductDisplay({ products }: { products: Product[] }) {
  // Simple state to track products (could be used for filtering/sorting later)
  const [displayProducts, setDisplayProducts] = useState(products);

  useEffect(() => {
    setDisplayProducts(products);
  }, [products]);

  // Calculate final price after discount
  const calculateFinalPrice = (price: number, discountRate: number): string => {
    const finalPrice = price * (1 - discountRate / 100);
    return finalPrice.toFixed(2);
  };

  if (displayProducts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xl">No products found</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayProducts.map((product) => (
          <Card
            key={product.$id}
            className="overflow-hidden flex flex-col h-full"
          >
            <div className="aspect-square w-full">
              {product.image_url ? (
                <ProductImage
                  imageId={product.image_url}
                  productName={product.name}
                />
              ) : (
                <img
                  src="/placeholder.svg?height=200&width=200"
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>{product.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="flex justify-between items-center">
                {product.discount_rate > 0 ? (
                  <div>
                    <p className="text-2xl font-bold">
                      $
                      {calculateFinalPrice(
                        product.price,
                        product.discount_rate
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground line-through">
                      ${product.price.toFixed(2)}
                    </p>
                  </div>
                ) : (
                  <p className="text-2xl font-bold">
                    ${product.price.toFixed(2)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  In stock: {product.quantity}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between px-4 pb-4">
              <Button variant="outline" className="w-full sm:w-auto" asChild>
                <Link href={`/products/${product.$id}`}>View Details</Link>
              </Button>
              <Button className="w-full sm:w-auto">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
