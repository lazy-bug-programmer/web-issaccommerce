/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams, useRouter } from "next/navigation";
import {
  createSale,
  getSales,
  updateSale,
} from "@/lib/appwrite/actions/sales.action";

// Define a type for the sale
type Sale = {
  $id: string;
  user_id: string;
  task_complete: number;
  total_sales: number;
  $createdAt: string;
};

// Create a schema for updating sales
const updateFormSchema = z.object({
  task_complete: z.coerce.number().int().nonnegative({
    message: "Tasks must be a non-negative number",
  }),
  total_sales: z.coerce.number().nonnegative({
    message: "Total sales must be a non-negative number",
  }),
});

export default function SellerSalesPage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = params.id as string;

  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof updateFormSchema>>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      task_complete: 0,
      total_sales: 0,
    },
  });

  useEffect(() => {
    if (sellerId) {
      fetchSales();
    }
  }, [sellerId]);

  async function fetchSales() {
    setIsLoading(true);
    try {
      // In a real implementation, you would fetch sales for this specific seller
      const response = await getSales();

      if (response && response.data) {
        // Filter to only show sales for this seller
        const sellerSales = response.data.filter(
          (sale: any) => sale.user_id === sellerId
        );

        if (sellerSales.length > 0) {
          setSale(sellerSales[0] as unknown as Sale);
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

  async function onSubmit(values: z.infer<typeof updateFormSchema>) {
    try {
      setIsSubmitting(true);

      if (sale) {
        // Update existing sale
        const response = await updateSale(sale.$id, {
          task_complete: values.task_complete,
          total_sales: values.total_sales,
        });

        if (response.error) {
          toast.error(response.error);
          return;
        }

        toast.success("Sales data updated successfully");
        setSale({
          ...sale,
          task_complete: values.task_complete,
          total_sales: values.total_sales,
        });
      } else {
        // Create new sale for this seller
        const response = await createSale({
          user_id: sellerId,
          task_complete: values.task_complete,
          total_sales: values.total_sales,
        });

        if (response.error) {
          toast.error(response.error);
          return;
        }

        toast.success("Sales data created successfully");
        fetchSales();
      }

      setOpen(false);
    } catch {
      toast.error("Failed to update sales data");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit() {
    if (sale) {
      form.reset({
        task_complete: sale.task_complete,
        total_sales: sale.total_sales,
      });
    } else {
      form.reset({
        task_complete: 0,
        total_sales: 0,
      });
    }
    setOpen(true);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/admin/seller")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Seller Sales
          </h2>
        </div>
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
              <Button variant="outline" size="icon" onClick={handleEdit}>
                <Edit className="h-4 w-4" />
              </Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {sale ? "Update Sales Data" : "Create Sales Data"}
            </DialogTitle>
            <DialogDescription>
              {sale
                ? "Update the sales information for this seller"
                : "Create initial sales data for this seller"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="total_sales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Sales</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="task_complete"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completed Tasks</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Saving..."
                    : sale
                    ? "Update data"
                    : "Create data"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
