"use client";

import { useEffect, useState } from "react";
import { getShipmentAutomationById } from "@/lib/actions/shipment-automations.action";
import { getProductById } from "@/lib/actions/product.action";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatDate } from "@/lib/utils";
import {
  Loader2,
  CheckCircle,
  Circle,
  Package,
  ShoppingBag,
  Clock,
} from "lucide-react";
import { ShipmentAutomation } from "@/lib/domains/shipment-automations.domain";
import { Product } from "@/lib/domains/products.domain";
import { getUserOrders } from "@/lib/actions/orders.action";
import { Orders } from "@/lib/domains/orders.domain";

interface OrderWithId extends Orders {
  $id: string;
}

interface ProgressStep {
  name: string;
  after_hour: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithId | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingAutomation, setLoadingAutomation] = useState(false);
  const [productData, setProductData] = useState<Record<string, Product>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        const response = await getUserOrders();
        if (response.data) {
          const orderData = response.data as unknown as OrderWithId[];
          setOrders(orderData);

          // Get unique product IDs to fetch
          const uniqueProductIds = [
            ...new Set(orderData.map((o) => o.product_id)),
          ];
          await fetchProductData(uniqueProductIds);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  // Fetch product data for all unique product IDs
  const fetchProductData = async (productIds: string[]) => {
    try {
      setLoadingProducts(true);
      const productMap: Record<string, Product> = {};

      // Fetch each product sequentially
      for (const id of productIds) {
        const response = await getProductById(id);
        if (response.data) {
          const product = response.data as unknown as Product;
          productMap[id] = product;
        }
      }

      setProductData(productMap);
    } catch (error) {
      console.error("Error fetching product data:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleViewDetail = async (order: OrderWithId) => {
    setSelectedOrder(order);
    setIsModalOpen(true);

    // Only fetch shipment automation if the order has one
    if (order.shipment_automation_id) {
      try {
        setLoadingAutomation(true);

        // Fetch shipment automation
        const automationResponse = await getShipmentAutomationById(
          order.shipment_automation_id
        );

        if (automationResponse.data) {
          const automationData =
            automationResponse.data as unknown as ShipmentAutomation & {
              $id: string;
            };

          // Parse the progress JSON string if it exists
          if (automationData.progress) {
            try {
              const parsedProgress = JSON.parse(
                automationData.progress
              ) as ProgressStep[];
              setProgressSteps(parsedProgress);
            } catch (e) {
              console.error("Error parsing progress JSON:", e);
              setProgressSteps([]);
            }
          } else {
            setProgressSteps([]);
          }
        }
      } catch (error) {
        console.error("Error fetching shipment details:", error);
      } finally {
        setLoadingAutomation(false);
      }
    } else {
      // Reset shipment data if there is no shipment
      setProgressSteps([]);
      setLoadingAutomation(false);
    }

    // If we don't have the product data yet, fetch it
    if (order.product_id && !productData[order.product_id]) {
      const productResponse = await getProductById(order.product_id);
      if (productResponse.data) {
        const product = productResponse.data as unknown as Product;
        setProductData((prev) => ({
          ...prev,
          [order.product_id]: product,
        }));
      }
    }
  };

  // Helper function to format date
  const formatDateValue = (date: Date | string) => {
    if (!date) return "N/A";
    return formatDate(
      date instanceof Date ? date.toISOString() : date.toString()
    );
  };

  // Get product details
  const getProductName = (productId: string) => {
    return productData[productId]?.name || "Product";
  };

  const getProductPrice = (productId: string) => {
    const product = productData[productId];
    if (!product) return "N/A";

    const price = product.price;
    const discountRate = product.discount_rate;

    if (discountRate > 0) {
      const finalPrice = price * (1 - discountRate / 100);
      return `$${finalPrice.toFixed(2)} (${discountRate}% off $${price.toFixed(
        2
      )})`;
    }

    return `$${price.toFixed(2)}`;
  };

  // Calculate the current progress based on order date and elapsed time
  const calculateCurrentProgress = (order: OrderWithId) => {
    if (!progressSteps.length) return null;

    const orderDate = new Date(order.ordered_at);
    const now = new Date();

    // Calculate hours elapsed since order
    const hoursElapsed =
      (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);

    // Find the current step based on elapsed time
    let currentStep = progressSteps[0];
    for (let i = progressSteps.length - 1; i >= 0; i--) {
      if (hoursElapsed >= progressSteps[i].after_hour) {
        currentStep = progressSteps[i];
        break;
      }
    }

    return currentStep;
  };

  // Get order status text
  const getOrderStatusText = (order: OrderWithId) => {
    if (!order.shipment_automation_id) {
      return "Preparing your order";
    }

    if (progressSteps.length === 0) {
      return "Processing";
    }

    const currentStep = calculateCurrentProgress(order);
    return currentStep?.name || "Processing";
  };

  // Render the orders page
  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : (
        <>
          {orders.length === 0 ? (
            <div className="text-center py-16 bg-muted/20 rounded-lg border border-dashed">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No orders yet</h3>
              <p className="text-muted-foreground">
                When you make a purchase, your orders will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {orders.map((order) => (
                <Card key={order.$id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {loadingProducts ? (
                          <span className="inline-flex items-center">
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Loading...
                          </span>
                        ) : (
                          getProductName(order.product_id)
                        )}
                      </CardTitle>
                      <div
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.shipment_automation_id
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {order.shipment_automation_id
                          ? "Shipping"
                          : "Preparing"}
                      </div>
                    </div>
                    <CardDescription>
                      Order #{order.$id.substring(0, 8)}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pb-3">
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Date: </span>
                        {formatDateValue(order.ordered_at)}
                      </div>

                      <div className="text-sm">
                        <span className="text-muted-foreground">Price: </span>
                        {loadingProducts ? (
                          <span className="inline-flex items-center">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          </span>
                        ) : (
                          getProductPrice(order.product_id)
                        )}
                      </div>

                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          Quantity:{" "}
                        </span>
                        {order.amount}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center text-sm">
                      {order.shipment_automation_id ? (
                        <Package className="h-4 w-4 mr-1.5 text-blue-500" />
                      ) : (
                        <Clock className="h-4 w-4 mr-1.5 text-amber-500" />
                      )}
                      <span className="font-medium">
                        {getOrderStatusText(order)}
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleViewDetail(order)}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Order Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            {selectedOrder && (
              <DialogDescription>
                Order #{selectedOrder.$id.substring(0, 8)} •{" "}
                {formatDateValue(selectedOrder.ordered_at)}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 mt-2">
              {/* Product Information */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Product Information</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    {loadingProducts ? (
                      <span className="inline-flex items-center">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      getProductName(selectedOrder.product_id)
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price:</span>{" "}
                    {loadingProducts ? (
                      <span className="inline-flex items-center">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      </span>
                    ) : (
                      getProductPrice(selectedOrder.product_id)
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quantity:</span>{" "}
                    {selectedOrder.amount}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total:</span>{" "}
                    {!loadingProducts &&
                    productData[selectedOrder.product_id] ? (
                      <span className="font-medium">
                        $
                        {(
                          productData[selectedOrder.product_id].price *
                          (1 -
                            productData[selectedOrder.product_id]
                              .discount_rate /
                              100) *
                          selectedOrder.amount
                        ).toFixed(2)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipment Information */}
              <div>
                <h3 className="font-semibold mb-3">Shipment Status</h3>

                {!selectedOrder.shipment_automation_id ? (
                  <div className="bg-amber-50 text-amber-700 p-4 rounded-lg flex items-start">
                    <Clock className="h-5 w-5 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium">Preparing Your Order</p>
                      <p className="text-sm">
                        Your order is being prepared and will be shipped soon.
                      </p>
                    </div>
                  </div>
                ) : loadingAutomation ? (
                  <div className="flex justify-center my-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : progressSteps.length > 0 ? (
                  <div className="relative pl-6 pb-2">
                    {/* Timeline Track */}
                    <div className="absolute left-[15px] top-0 h-full w-[2px] bg-gray-200"></div>

                    {/* Progress Steps */}
                    <div className="space-y-8 relative z-10">
                      {progressSteps.map((step, index) => {
                        const currentStep =
                          calculateCurrentProgress(selectedOrder);
                        const isCompleted =
                          currentStep &&
                          step.after_hour <= currentStep.after_hour;
                        const isCurrent =
                          currentStep && step.name === currentStep.name;

                        return (
                          <div key={index} className="flex items-start">
                            <div className="mr-3 absolute left-[-20px]">
                              {isCompleted ? (
                                <CheckCircle className="h-7 w-7 text-green-500" />
                              ) : (
                                <Circle
                                  className={`h-7 w-7 ${
                                    isCurrent
                                      ? "text-blue-500"
                                      : "text-gray-300"
                                  }`}
                                />
                              )}
                            </div>
                            <div className="pl-5">
                              <h4
                                className={`font-medium ${
                                  isCurrent
                                    ? "text-blue-600"
                                    : isCompleted
                                    ? "text-green-600"
                                    : "text-gray-600"
                                }`}
                              >
                                {step.name}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {step.after_hour === 0
                                  ? "Immediately after ordering"
                                  : `${step.after_hour} hours after ordering`}
                              </p>
                              {isCurrent && (
                                <p className="text-sm font-medium text-blue-500 mt-1">
                                  Current Status
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">
                    No shipment progress information available.
                  </p>
                )}
              </div>

              {/* Order Details Accordion */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="details">
                  <AccordionTrigger>Technical Details</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Order ID:</span>{" "}
                        {selectedOrder.$id}
                      </div>
                      {selectedOrder.shipment_automation_id && (
                        <div>
                          <span className="font-medium">Shipment ID:</span>{" "}
                          {selectedOrder.shipment_automation_id}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Product ID:</span>{" "}
                        {selectedOrder.product_id}
                      </div>
                      <div>
                        <span className="font-medium">User ID:</span>{" "}
                        {selectedOrder.user_id}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
