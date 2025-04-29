"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProductImage } from "@/lib/actions/product.action";
import { Product } from "@/lib/domains/products.domain";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

// Carousel component for displaying multiple product images
function ProductImageCarousel({
  imageUrls,
  productName,
}: {
  imageUrls: string[];
  productName: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? imageUrls.length - 1 : prevIndex - 1
    );
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) =>
      prevIndex === imageUrls.length - 1 ? 0 : prevIndex + 1
    );
  };

  // If no images, show placeholder
  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className="aspect-square w-full bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400">No images</span>
      </div>
    );
  }

  // If only one image, don't need navigation
  if (imageUrls.length === 1) {
    return <ProductImage imageId={imageUrls[0]} productName={productName} />;
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden">
      <div className="h-full w-full">
        <ProductImage
          imageId={imageUrls[currentIndex]}
          productName={productName}
        />
      </div>

      {/* Navigation arrows */}
      <div className="absolute inset-0 flex items-center justify-between p-2">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-full bg-white/70 shadow hover:bg-white/90"
          onClick={goToPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-full bg-white/70 shadow hover:bg-white/90"
          onClick={goToNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
        {imageUrls.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 w-1.5 rounded-full ${
              index === currentIndex ? "bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Main component that receives products from server component
export default function ProductDisplay({ products }: { products: Product[] }) {
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [visibleProductsCount, setVisibleProductsCount] = useState(50);

  // Utility function to truncate text
  const truncateText = (text: string, maxLength: number = 100): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Fisher-Yates shuffle algorithm
  const shuffleArray = (array: Product[]): Product[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    // Randomize the products order
    const randomizedProducts = shuffleArray(products);
    setDisplayProducts(randomizedProducts);
  }, [products]);

  const calculateFinalPrice = (price: number, discountRate: number): number => {
    return price * (1 - discountRate / 100);
  };

  const handleShowMore = () => {
    setVisibleProductsCount((prev) => prev + 50);
  };

  if (displayProducts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xl">No products found</p>
      </div>
    );
  }

  // Get only the number of products we want to display
  const visibleProducts = displayProducts.slice(0, visibleProductsCount);
  const hasMoreProducts = visibleProductsCount < displayProducts.length;

  return (
    <>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleProducts.map((product) => (
          <Card
            key={product.$id}
            className="overflow-hidden flex flex-col h-full"
          >
            <div className="aspect-square w-full">
              {product.image_urls && product.image_urls.length > 0 ? (
                <ProductImageCarousel
                  imageUrls={product.image_urls}
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
              <CardDescription>
                {truncateText(product.description, 100)}
                {product.description && product.description.length > 100 && (
                  <a
                    href="/task"
                    className="block text-blue-500 hover:text-blue-700 text-sm mt-1"
                  >
                    Show more
                  </a>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="flex justify-between items-center">
                {product.discount_rate > 0 ? (
                  <div>
                    <p className="text-2xl font-bold">
                      ৳
                      {calculateFinalPrice(
                        product.price,
                        product.discount_rate
                      ).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground line-through">
                      ৳{product.price.toFixed(2)}
                    </p>
                  </div>
                ) : (
                  <p className="text-2xl font-bold">
                    ৳{product.price.toFixed(2)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  In stock: {product.quantity}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Show More button */}
      {hasMoreProducts && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={handleShowMore}
            className="bg-gradient-to-r from-blue-500 to-indigo-600"
          >
            Show More Products ({visibleProductsCount} of{" "}
            {displayProducts.length})
          </Button>
        </div>
      )}
    </>
  );
}
