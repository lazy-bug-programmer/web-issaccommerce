"use client";

import { useEffect, useState } from "react";
import { getUserShipments } from "@/lib/appwrite/actions/shipments.action";
import { getShipmentAutomationById } from "@/lib/appwrite/actions/shipment-automations.action";
import { getProductById } from "@/lib/appwrite/actions/product.action";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { Loader2, CheckCircle, Circle } from "lucide-react";
import { Shipment } from "@/lib/domains/shipments.domain";
import { ShipmentAutomation } from "@/lib/domains/shipment-automations.domain";
import { Product } from "@/lib/domains/products.domain";

// Define extended shipment with Appwrite properties
interface ShipmentWithId extends Shipment {
  $id: string;
}

interface ProgressStep {
  name: string;
  after_hour: number;
}

export default function SellerShipment() {
  const [shipments, setShipments] = useState<ShipmentWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] =
    useState<ShipmentWithId | null>(null);
  const [shipmentAutomation, setShipmentAutomation] =
    useState<ShipmentAutomation | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingAutomation, setLoadingAutomation] = useState(false);
  const [productData, setProductData] = useState<Record<string, string>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    async function fetchShipments() {
      try {
        setLoading(true);
        const response = await getUserShipments();
        if (response.data) {
          const shipmentData = response.data as unknown as ShipmentWithId[];
          setShipments(shipmentData);

          // Get unique product IDs to fetch
          const uniqueProductIds = [
            ...new Set(shipmentData.map((s) => s.product_id)),
          ];
          await fetchProductNames(uniqueProductIds);
        }
      } catch (error) {
        console.error("Error fetching shipments:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchShipments();
  }, []);

  // Fetch product names for all unique product IDs
  const fetchProductNames = async (productIds: string[]) => {
    try {
      setLoadingProducts(true);
      const productMap: Record<string, string> = {};

      // Fetch each product sequentially
      for (const id of productIds) {
        const response = await getProductById(id);
        if (response.data) {
          const product = response.data as unknown as Product;
          productMap[id] = product.name;
        }
      }

      setProductData(productMap);
    } catch (error) {
      console.error("Error fetching product data:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleViewDetail = async (shipment: ShipmentWithId) => {
    setSelectedShipment(shipment);
    setIsModalOpen(true);

    try {
      setLoadingAutomation(true);

      // Fetch shipment automation
      const automationResponse = await getShipmentAutomationById(
        shipment.shipment_automation_id
      );

      if (automationResponse.data) {
        const automationData =
          automationResponse.data as unknown as ShipmentAutomation & {
            $id: string;
          };
        setShipmentAutomation(automationData);

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

      // If we don't have the product data yet, fetch it
      if (!productData[shipment.product_id]) {
        const productResponse = await getProductById(shipment.product_id);
        if (productResponse.data) {
          const product = productResponse.data as unknown as Product;
          setProductData((prev) => ({
            ...prev,
            [shipment.product_id]: product.name,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setLoadingAutomation(false);
    }
  };

  // Helper function to format date that accepts Date object
  const formatDateValue = (date: Date | string) => {
    if (!date) return "N/A";
    return formatDate(
      date instanceof Date ? date.toISOString() : date.toString()
    );
  };

  // Get product name or show ID if name not available
  const getProductName = (productId: string) => {
    return productData[productId] || productId;
  };

  // Calculate the current progress based on order date and elapsed time
  const calculateCurrentProgress = () => {
    if (!selectedShipment || !progressSteps.length) return null;

    const orderDate = new Date(selectedShipment.order_date);
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

  const currentStep = calculateCurrentProgress();

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Shipment Management</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : (
        <>
          {shipments.length === 0 ? (
            <div className="text-center py-10 border rounded-lg">
              <p className="text-gray-500">No shipments found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Shipment ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => (
                    <TableRow key={shipment.$id}>
                      <TableCell className="font-medium">
                        {shipment.customer_name}
                      </TableCell>
                      <TableCell>
                        {formatDateValue(shipment.order_date)}
                      </TableCell>
                      <TableCell>
                        {loadingProducts ? (
                          <span className="inline-flex items-center">
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Loading...
                          </span>
                        ) : (
                          getProductName(shipment.product_id)
                        )}
                      </TableCell>
                      <TableCell>{shipment.shipment_automation_id}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(shipment)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Shipment Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Shipment Details</DialogTitle>
          </DialogHeader>

          {selectedShipment && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Customer Name
                  </h3>
                  <p className="mt-1">{selectedShipment.customer_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Order Date
                  </h3>
                  <p className="mt-1">
                    {formatDateValue(selectedShipment.order_date)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Product</h3>
                  <p className="mt-1">
                    {loadingAutomation ? (
                      <span className="inline-flex items-center">
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      getProductName(selectedShipment.product_id)
                    )}
                    <span className="text-xs text-gray-400 ml-1">
                      (ID: {selectedShipment.product_id})
                    </span>
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Shipment Automation
                  </h3>
                  <p className="mt-1">
                    {loadingAutomation ? (
                      <span className="inline-flex items-center">
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Loading...
                      </span>
                    ) : shipmentAutomation ? (
                      shipmentAutomation.name
                    ) : (
                      selectedShipment.shipment_automation_id
                    )}
                  </p>
                </div>
              </div>

              {/* Shipment Automation Progress */}
              <div className="mt-6">
                <h3 className="text-md font-semibold mb-4">
                  Shipping Progress
                </h3>

                {loadingAutomation ? (
                  <div className="flex justify-center my-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  </div>
                ) : shipmentAutomation ? (
                  <>
                    {progressSteps.length > 0 ? (
                      <div className="relative">
                        {/* Timeline Track */}
                        <div className="absolute left-[15px] top-0 h-full w-[2px] bg-gray-200"></div>

                        {/* Progress Steps */}
                        <div className="space-y-6 relative z-10">
                          {progressSteps.map((step, index) => {
                            const isCompleted =
                              currentStep &&
                              step.after_hour <= currentStep.after_hour;
                            const isCurrent =
                              currentStep && step.name === currentStep.name;

                            return (
                              <div key={index} className="flex items-start">
                                <div className="mr-3">
                                  {isCompleted ? (
                                    <CheckCircle className="h-8 w-8 text-green-500" />
                                  ) : (
                                    <Circle
                                      className={`h-8 w-8 ${
                                        isCurrent
                                          ? "text-blue-500"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  )}
                                </div>
                                <div>
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
                                      ? "Immediately after order"
                                      : `${step.after_hour} hours after order`}
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
                      <p className="text-gray-500">
                        No progress information available
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">No automation data found</p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500">User ID</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {selectedShipment.user_id}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Document ID
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  {selectedShipment.$id}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
