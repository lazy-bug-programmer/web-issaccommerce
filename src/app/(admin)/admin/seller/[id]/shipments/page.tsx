/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  adminGetAllOrders,
  addShipmentToOrder,
} from "@/lib/actions/orders.action";
import { getShipmentAutomations } from "@/lib/actions/shipment-automations.action";
import { ShipmentAutomation } from "@/lib/domains/shipment-automations.domain";
import { format } from "date-fns";
import { toast } from "sonner";

export default function SellerShipmentsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [automations, setAutomations] = useState<ShipmentAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAutomations, setSelectedAutomations] = useState<
    Record<string, string>
  >({});
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [ordersResponse, automationsResponse] = await Promise.all([
        adminGetAllOrders(),
        getShipmentAutomations(100),
      ]);

      if (ordersResponse.error) {
        toast.error(ordersResponse.error);
        return;
      }

      if (automationsResponse.error) {
        toast.error(automationsResponse.error);
        return;
      }

      setOrders(ordersResponse.data || []);
      setAutomations(
        (automationsResponse.data as unknown as ShipmentAutomation[]) || []
      );
    } catch (error) {
      toast.error("Failed to fetch data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignAutomation(orderId: string) {
    if (!selectedAutomations[orderId]) {
      toast.error("Please select an automation");
      return;
    }

    setProcessingOrder(orderId);
    try {
      const result = await addShipmentToOrder(
        orderId,
        selectedAutomations[orderId]
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Shipment automation assigned successfully");
      // Update the local orders data
      setOrders(
        orders.map((order) => {
          if (order.$id === orderId) {
            return {
              ...order,
              shipment_automation_id: selectedAutomations[orderId],
            };
          }
          return order;
        })
      );

      // Clear the selection for this order
      const newSelectedAutomations = { ...selectedAutomations };
      delete newSelectedAutomations[orderId];
      setSelectedAutomations(newSelectedAutomations);
    } catch (error) {
      toast.error("Failed to assign automation");
      console.error(error);
    } finally {
      setProcessingOrder(null);
    }
  }

  function formatDate(dateStr: string) {
    try {
      return format(new Date(dateStr), "MMM dd, yyyy HH:mm");
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Orders & Shipments</span>
            <Button onClick={fetchData} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">No orders found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Product ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Shipment Automation</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.$id}>
                    <TableCell>{formatDate(order.ordered_at)}</TableCell>
                    <TableCell>{order.product_id}</TableCell>
                    <TableCell>{order.amount}</TableCell>
                    <TableCell>{order.user_id}</TableCell>
                    <TableCell>
                      {order.shipment_automation_id ? (
                        <div className="bg-green-100 text-green-800 px-2 py-1 rounded inline-block">
                          {automations.find(
                            (a) => a.$id === order.shipment_automation_id
                          )?.name || order.shipment_automation_id}
                        </div>
                      ) : (
                        <Select
                          value={selectedAutomations[order.$id] || ""}
                          onValueChange={(value) => {
                            setSelectedAutomations({
                              ...selectedAutomations,
                              [order.$id]: value,
                            });
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select automation" />
                          </SelectTrigger>
                          <SelectContent>
                            {automations.map((automation) => (
                              <SelectItem
                                key={automation.$id}
                                value={automation.$id || ""}
                              >
                                {automation.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {!order.shipment_automation_id && (
                        <Button
                          size="sm"
                          disabled={
                            !selectedAutomations[order.$id] ||
                            processingOrder === order.$id
                          }
                          onClick={() => handleAssignAutomation(order.$id)}
                        >
                          {processingOrder === order.$id
                            ? "Assigning..."
                            : "Assign"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
