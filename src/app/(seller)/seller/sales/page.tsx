"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserSales } from "@/lib/appwrite/actions/sales.action";

// Define a type for the sale
type Sale = {
  $id: string;
  user_id: string;
  task_complete: number;
  total_sales: number;
  $createdAt: string;
};

export default function SalesPage() {
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    setIsLoading(true);
    try {
      const response = await getUserSales();

      if (response && response.data) {
        if (response.data.length > 0) {
          setSale(response.data[0] as unknown as Sale);
        } else {
          setSale(null);
        }
      } else {
        toast.error("Failed to fetch sales data");
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast.error("Failed to fetch sales data");
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          My Sales Dashboard
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading sales data...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${sale?.total_sales.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground">
                {sale
                  ? `Last updated: ${formatDate(sale.$createdAt)}`
                  : "No sales data available"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sale?.task_complete || "0"}
              </div>
              <p className="text-xs text-muted-foreground">
                Total completed tasks
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
