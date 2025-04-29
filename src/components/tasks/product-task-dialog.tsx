/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateProduct } from "@/lib/actions/product.action";
import { Product } from "@/lib/domains/products.domain";
import { getUserSales, updateSale } from "@/lib/actions/sales.action";
import { Sale } from "@/lib/domains/sales.domain";
import { createOrder } from "@/lib/actions/orders.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { productCache } from "@/lib/utils/product-cache";
import { getTaskSettingsById } from "@/lib/actions/task-settings.action";
import { ProductImageCarousel } from "./product-image-carousel";

interface ProductTaskDialogProps {
  productId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function ProductTaskDialog({
  productId,
  onComplete,
  onCancel,
}: ProductTaskDialogProps) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [userSale, setUserSale] = useState<Sale | null>(null);
  const [hasSufficientFunds, setHasSufficientFunds] = useState(false);
  const [totalAvailableFunds, setTotalAvailableFunds] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [requiredAmount, setRequiredAmount] = useState<number | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        // Use enhanced cache method
        const product = await productCache.getOrFetch(productId);

        if (product) {
          setProduct(product);
        } else {
          toast.error("Product not found");
        }
      } catch (error) {
        console.error("Failed to fetch product:", error);
        toast.error("Failed to load product details");
      } finally {
        setLoading(false);
      }
    };

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

    // Fetch task settings to get required amount
    const fetchTaskSettingsForProduct = async () => {
      try {
        const result = await getTaskSettingsById("task-settings");
        if (result.data && result.data.settings) {
          const settingsData = JSON.parse(result.data.settings);

          // Find task that requires this product
          const taskEntry = Object.entries(settingsData).find(
            ([_, taskItem]: [string, unknown]) =>
              typeof taskItem === "object" &&
              taskItem !== null &&
              "product_id" in taskItem &&
              taskItem.product_id === productId
          );

          if (
            taskEntry &&
            typeof taskEntry[1] === "object" &&
            taskEntry[1] !== null &&
            "amount" in taskEntry[1] &&
            taskEntry[1].amount
          ) {
            const amount = parseInt(String(taskEntry[1].amount));
            if (!isNaN(amount)) {
              setRequiredAmount(amount);
              setQuantity(amount); // Set initial quantity to required amount
            }
          }
        }
      } catch (error) {
        console.error("Error fetching task settings for product:", error);
      }
    };

    if (productId) {
      fetchProduct();
      fetchUserSale();
      fetchTaskSettingsForProduct();
    }
  }, [productId]);

  // Check if user has sufficient funds when product and userSale are loaded
  useEffect(() => {
    if (product && userSale) {
      const finalPrice = calculatePrice(product.price, product.discount_rate);
      const totalCost = finalPrice * quantity;

      // Check if trial_bonus_date is today
      const today = new Date().toDateString();
      const isTrialBonusToday = userSale.trial_bonus_date
        ? new Date(userSale.trial_bonus_date).toDateString() === today
        : false;

      // Calculate available money based on trial bonus date
      const totalMoney = isTrialBonusToday
        ? (userSale.trial_bonus || 0) + (userSale.balance || 0)
        : userSale.balance || 0;

      setTotalAvailableFunds(totalMoney);

      // Set state based on whether user has enough money
      if (totalMoney < totalCost) {
        setErrorMessage(
          `Insufficient balance. Please topup via Customer Service`
        );
        setHasSufficientFunds(false);
      } else {
        setHasSufficientFunds(true);
        setErrorMessage("");
      }
    }
  }, [product, userSale, quantity]);

  // Calculate discounted price
  const calculatePrice = (price: number, discountRate: number) => {
    return price - (price * discountRate) / 100;
  };

  // Format currency
  const formatCurrency = (price: number) => {
    return `৳ ${price.toFixed(2)}`;
  };

  const handlePurchaseAndComplete = async () => {
    if (!product || !userSale || !hasSufficientFunds) {
      return;
    }

    // Verify quantity matches required amount if specified
    if (requiredAmount !== null && quantity !== requiredAmount) {
      setErrorMessage(
        `You must purchase exactly ${requiredAmount} units to complete this task.`
      );
      return;
    }

    setIsProcessing(true);

    try {
      const finalPrice = calculatePrice(product.price, product.discount_rate);
      const totalCost = finalPrice * quantity;

      // 1. Update product quantity
      const updatedProduct = await updateProduct(product.$id, {
        quantity: product.quantity - quantity,
      });

      if (!updatedProduct.data) {
        throw new Error("Failed to update product quantity");
      }

      // 2. Calculate cashback (3% of total cost)
      const cashbackAmount = totalCost * 0.03;

      // 3. Update user's balance based on available funds
      const updateData: Partial<Sale> = {
        balance: (userSale.balance || 0) + cashbackAmount,
        today_bonus: (userSale.today_bonus || 0) + cashbackAmount,
        today_bonus_date: new Date(),
        total_earning: (userSale.total_earning || 0) + cashbackAmount,
      };

      const updatedSale = await updateSale(userSale.$id, updateData);

      if (!updatedSale.data) {
        throw new Error("Failed to update user balance");
      }

      // 4. Create an order record
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

      toast.success(
        `Successfully purchased ${quantity} ${
          product.name
        }! Earned ${cashbackAmount.toFixed(2)} cashback.`
      );

      // Small delay to ensure backend has processed the order
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Call the onComplete to continue the task flow
      onComplete();
    } catch (error) {
      console.error("Error processing purchase:", error);
      setErrorMessage("Failed to process purchase. Please try again.");
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p>Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Product not found</h3>
        <p className="mt-2 text-muted-foreground">
          The requested product could not be found.
        </p>
        <Button className="mt-4" onClick={onCancel}>
          Close
        </Button>
      </div>
    );
  }

  const finalPrice = calculatePrice(product.price, product.discount_rate);
  const totalCost = finalPrice * quantity;

  return (
    <div className="p-4 max-h-[80vh] overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product image and basic info */}
        <div className="flex flex-col">
          <div className="aspect-square w-full max-w-[400px] mx-auto">
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
          <h2 className="text-xl font-semibold mt-4">{product.name}</h2>
          <div className="mt-2">
            <p className={showFullDescription ? "" : "line-clamp-3"}>
              {product.description}
            </p>
            {product.description && product.description.length > 150 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-sm text-blue-500 hover:text-blue-700 mt-1 focus:outline-none"
              >
                {showFullDescription ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        </div>

        {/* Pricing and purchase section */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Price</h3>
            <p className="text-xl font-bold text-green-500">
              {formatCurrency(finalPrice)}
            </p>
          </div>

          {requiredAmount !== null && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800 mt-4">
              <p className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
                <AlertCircle size={16} />
                This task requires purchasing exactly {requiredAmount}{" "}
                {requiredAmount === 1 ? "unit" : "units"}
              </p>
            </div>
          )}

          <div className="bg-muted/20 p-3 rounded-md mt-4">
            <p className="flex justify-between font-medium">
              <span>Cost:</span>
              <span>{formatCurrency(totalCost)}</span>
            </p>
            {requiredAmount !== null && (
              <p className="text-sm text-muted-foreground mt-1">
                Fixed quantity: {requiredAmount}{" "}
                {requiredAmount === 1 ? "unit" : "units"}
              </p>
            )}
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded border border-red-200 mt-4">
              <AlertCircle size={16} />
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}

          <div className="border rounded p-4 bg-muted/30 mt-4">
            <div className="text-sm space-y-1">
              <p className="font-medium">Your Balance:</p>
              <div className="flex flex-col text-muted-foreground">
                {userSale?.trial_bonus_date &&
                new Date(userSale.trial_bonus_date).toDateString() ===
                  new Date().toDateString() ? (
                  <span>
                    Trial: {formatCurrency(userSale?.trial_bonus || 0)}
                  </span>
                ) : null}
                <span>Regular: {formatCurrency(userSale?.balance || 0)}</span>
                <span
                  className={`border-t pt-1 font-medium ${
                    hasSufficientFunds ? "text-foreground" : "text-red-500"
                  }`}
                >
                  Total: {formatCurrency(totalAvailableFunds)}
                  {!hasSufficientFunds &&
                    ` (-${formatCurrency(
                      totalCost - totalAvailableFunds
                    )}, please contact Customer Service)`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={onCancel} className="w-full">
                Cancel
              </Button>
              <Button
                variant="outline"
                className="w-full bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
                onClick={() => router.push("/contact")}
              >
                Customer Service
              </Button>
            </div>

            <Button
              className="w-full h-full bg-gradient-to-r from-green-400 to-emerald-600 hover:from-green-500 hover:to-emerald-700"
              onClick={handlePurchaseAndComplete}
              disabled={isProcessing || !hasSufficientFunds}
            >
              {isProcessing
                ? "Processing..."
                : hasSufficientFunds
                ? "Complete Purchase"
                : "Insufficient Funds"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
