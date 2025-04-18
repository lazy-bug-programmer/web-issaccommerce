"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProductImage, updateProduct } from "@/lib/actions/product.action";
import { getUserSales, updateSale } from "@/lib/actions/sales.action";
import { createOrder } from "@/lib/actions/orders.action";
import { Product } from "@/lib/domains/products.domain";
import { Sale } from "@/lib/domains/sales.domain";
import { ShoppingBag, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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

// Main component that receives products from server component
export default function ProductDisplay({ products }: { products: Product[] }) {
  const [displayProducts, setDisplayProducts] = useState(products);
  const [purchaseDialog, setPurchaseDialog] = useState<{
    open: boolean;
    product: Product | null;
    quantity: number;
  }>({ open: false, product: null, quantity: 1 });
  const [userSale, setUserSale] = useState<Sale | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setDisplayProducts(products);
  }, [products]);

  useEffect(() => {
    const fetchUserSale = async () => {
      try {
        const result = await getUserSales();
        if (result.data && result.data.length > 0) {
          setUserSale(result.data[0] as unknown as Sale);
        }
      } catch (error) {
        console.error("Error fetching user sales data:", error);
      }
    };

    fetchUserSale();
  }, []);

  const calculateFinalPrice = (price: number, discountRate: number): number => {
    return price * (1 - discountRate / 100);
  };

  const handleOpenPurchaseDialog = (product: Product) => {
    setPurchaseDialog({
      open: true,
      product,
      quantity: 1,
    });
    setErrorMessage("");
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (
      !isNaN(value) &&
      value >= 1 &&
      purchaseDialog.product &&
      value <= purchaseDialog.product.quantity
    ) {
      setPurchaseDialog({
        ...purchaseDialog,
        quantity: value,
      });
      setErrorMessage("");
    } else if (
      purchaseDialog.product &&
      value > purchaseDialog.product.quantity
    ) {
      setErrorMessage(
        `Only ${purchaseDialog.product.quantity} items available`
      );
    }
  };

  const handlePurchase = async () => {
    if (!purchaseDialog.product || !userSale) return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const product = purchaseDialog.product;
      const quantity = purchaseDialog.quantity;
      const finalPrice = calculateFinalPrice(
        product.price,
        product.discount_rate
      );
      const totalCost = finalPrice * quantity;

      const trialBalance = userSale.trial_balance || 0;
      const regularBalance = userSale.balance || 0;

      if (trialBalance + regularBalance < totalCost) {
        setErrorMessage("Insufficient balance to complete this purchase");
        setIsProcessing(false);
        return;
      }

      // 1. Update product quantity
      const updatedProduct = await updateProduct(product.$id, {
        quantity: product.quantity - quantity,
      });

      if (!updatedProduct.data) {
        throw new Error("Failed to update product quantity");
      }

      // 2. Update user's balance
      let updatedTrialBalance = trialBalance;
      let updatedRegularBalance = regularBalance;

      if (trialBalance >= totalCost) {
        updatedTrialBalance = trialBalance - totalCost;
      } else {
        const remainingCost = totalCost - trialBalance;
        updatedTrialBalance = 0;
        updatedRegularBalance = regularBalance - remainingCost;
      }

      const updatedSale = await updateSale(userSale.$id, {
        trial_balance: updatedTrialBalance,
        balance: updatedRegularBalance,
      });

      if (!updatedSale.data) {
        throw new Error("Failed to update user balance");
      }

      // 3. Create an order record
      const orderResult = await createOrder({
        product_id: product.$id,
        amount: quantity,
        shipment_automation_id: "",
      });

      if (!orderResult.data) {
        console.error(
          "Warning: Order record creation failed, but payment was processed"
        );
      }

      // Update the UI
      setDisplayProducts(
        displayProducts.map((p) =>
          p.$id === product.$id ? { ...p, quantity: p.quantity - quantity } : p
        )
      );

      setUserSale({
        ...userSale,
        trial_balance: updatedTrialBalance,
        balance: updatedRegularBalance,
      });

      setPurchaseDialog({ open: false, product: null, quantity: 1 });
      toast.success(`Successfully purchased ${quantity} ${product.name}`);
    } catch (error) {
      console.error("Error processing purchase:", error);
      setErrorMessage("Failed to process purchase. Please try again.");
    } finally {
      setIsProcessing(false);
    }
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
                      ).toFixed(2)}
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
            <CardFooter className="px-4 pb-4">
              <Button
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600"
                onClick={() => handleOpenPurchaseDialog(product)}
                disabled={product.quantity <= 0}
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Buy Now
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog
        open={purchaseDialog.open}
        onOpenChange={(open) => {
          if (!open)
            setPurchaseDialog({ open: false, product: null, quantity: 1 });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Purchase</DialogTitle>
            <DialogDescription>
              {purchaseDialog.product?.name} - $
              {purchaseDialog.product &&
                calculateFinalPrice(
                  purchaseDialog.product.price,
                  purchaseDialog.product.discount_rate
                ).toFixed(2)}{" "}
              each
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                value={purchaseDialog.quantity}
                onChange={handleQuantityChange}
                min={1}
                max={purchaseDialog.product?.quantity || 1}
                className="col-span-3"
              />
            </div>

            {purchaseDialog.product && (
              <div className="border rounded p-3 bg-muted/30">
                <p className="flex justify-between">
                  <span>Price per unit:</span>
                  <span>
                    $
                    {calculateFinalPrice(
                      purchaseDialog.product.price,
                      purchaseDialog.product.discount_rate
                    ).toFixed(2)}
                  </span>
                </p>
                <p className="flex justify-between font-bold text-lg mt-2">
                  <span>Total:</span>
                  <span>
                    $
                    {(
                      calculateFinalPrice(
                        purchaseDialog.product.price,
                        purchaseDialog.product.discount_rate
                      ) * purchaseDialog.quantity
                    ).toFixed(2)}
                  </span>
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 text-red-500 bg-red-50 p-2 rounded border border-red-200">
                <AlertCircle size={16} />
                <p className="text-sm">{errorMessage}</p>
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between flex-col sm:flex-row gap-2">
            <div className="text-sm space-y-1">
              <p className="font-medium">Your Balance:</p>
              <div className="flex flex-col text-muted-foreground">
                <span>Trial: ${(userSale?.trial_balance || 0).toFixed(2)}</span>
                <span>Regular: ${(userSale?.balance || 0).toFixed(2)}</span>
                <span className="border-t pt-1 font-medium text-foreground">
                  Total: $
                  {(
                    (userSale?.balance || 0) + (userSale?.trial_balance || 0)
                  ).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                variant="default"
                onClick={handlePurchase}
                disabled={isProcessing || !!errorMessage}
              >
                {isProcessing ? "Processing..." : "Complete Purchase"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
