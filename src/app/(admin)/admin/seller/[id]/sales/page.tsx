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
import { createSale, getSales, updateSale } from "@/lib/actions/sales.action";
import { Sale } from "@/lib/domains/sales.domain";

// Create a schema for updating sales
const updateFormSchema = z.object({
  balance: z.coerce.number().nonnegative({
    message: "Balance must be a non-negative number",
  }),
  number_of_rating: z.coerce.number().nonnegative({
    message: "Number of ratings must be a non-negative number",
  }),
  total_earning: z.coerce.number().nonnegative({
    message: "Total earnings must be a non-negative number",
  }),
  trial_bonus: z.coerce.number().nonnegative().nullable(),
  trial_bonus_date: z.string().nullable(),
  today_bonus: z.coerce.number().nonnegative().nullable(),
  today_bonus_date: z.string().nullable(),
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
      balance: 0,
      number_of_rating: 0,
      total_earning: 0,
      trial_bonus: null,
      trial_bonus_date: null,
      today_bonus: null,
      today_bonus_date: null,
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
      const response = await getSales();

      if (response && response.data) {
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
        const response = await updateSale(sale.$id, {
          balance: values.balance,
          number_of_rating: values.number_of_rating,
          total_earning: values.total_earning,
          trial_bonus: values.trial_bonus ?? undefined,
          trial_bonus_date: values.trial_bonus_date
            ? new Date(values.trial_bonus_date)
            : undefined,
          today_bonus: values.today_bonus ?? undefined,
          today_bonus_date: values.today_bonus_date
            ? new Date(values.today_bonus_date)
            : undefined,
        });

        if (response.error) {
          toast.error(response.error);
          return;
        }

        toast.success("Sales data updated successfully");
        setSale({
          ...sale,
          balance: values.balance,
          number_of_rating: values.number_of_rating,
          total_earning: values.total_earning,
          trial_bonus: values.trial_bonus ?? 0,
          trial_bonus_date: values.trial_bonus_date
            ? new Date(values.trial_bonus_date)
            : new Date(),
          today_bonus: values.today_bonus ?? 0,
          today_bonus_date: values.today_bonus_date
            ? new Date(values.today_bonus_date)
            : new Date(),
        });
      } else {
        const response = await createSale({
          $id: "",
          user_id: sellerId,
          balance: values.balance,
          number_of_rating: values.number_of_rating,
          total_earning: values.total_earning,
          trial_bonus: values.trial_bonus ?? 0,
          trial_bonus_date: values.trial_bonus_date
            ? new Date(values.trial_bonus_date)
            : new Date(),
          today_bonus: values.today_bonus ?? 0,
          today_bonus_date: values.today_bonus_date
            ? new Date(values.today_bonus_date)
            : new Date(),
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
        balance: sale.balance,
        number_of_rating: sale.number_of_rating,
        total_earning: sale.total_earning,
        trial_bonus: sale.trial_bonus,
        trial_bonus_date: getDateString(sale.trial_bonus_date),
        today_bonus: sale.today_bonus,
        today_bonus_date: getDateString(sale.today_bonus_date),
      });
    } else {
      form.reset({
        balance: 0,
        number_of_rating: 0,
        total_earning: 0,
        trial_bonus: null,
        trial_bonus_date: null,
        today_bonus: null,
        today_bonus_date: null,
      });
    }
    setOpen(true);
  }

  // Helper function to safely convert different date formats to YYYY-MM-DD string
  function getDateString(
    dateValue: string | Date | null | undefined
  ): string | null {
    if (!dateValue) return null;

    try {
      // If it's a string that doesn't look like a date, return null
      if (typeof dateValue === "string" && isNaN(Date.parse(dateValue))) {
        return null;
      }

      // Convert to Date object and then to ISO string
      const date =
        typeof dateValue === "string" ? new Date(dateValue) : dateValue;
      return date.toISOString().split("T")[0];
    } catch (error) {
      console.error("Error parsing date:", error);
      return null;
    }
  }

  // Helper function to safely format date for display
  function formatDisplayDate(
    dateValue: string | Date | null | undefined
  ): string {
    if (!dateValue) return "";

    try {
      // If it's a string that doesn't look like a date, return empty string
      if (typeof dateValue === "string" && isNaN(Date.parse(dateValue))) {
        return "";
      }

      // Convert to Date object and format for display
      const date =
        typeof dateValue === "string" ? new Date(dateValue) : dateValue;
      return date.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date for display:", error);
      return "";
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/superadmin/seller")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Seller Sales
          </h2>
        </div>
        <Button onClick={handleEdit} className="gap-2">
          <Edit className="h-4 w-4" /> Edit Sales Data
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading sales data...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ৳{sale?.balance.toFixed(2) || "0.00"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ৳{sale?.total_earning.toFixed(2) || "0.00"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Bonus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ৳
                {sale?.trial_bonus !== null
                  ? sale?.trial_bonus.toFixed(2)
                  : "0.00"}
              </div>
              {sale?.trial_bonus_date && (
                <div className="text-xs text-muted-foreground mt-1">
                  Date: {formatDisplayDate(sale.trial_bonus_date)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Number of Ratings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sale?.number_of_rating || "0"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today&apos;s Bonus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ৳
                {sale?.today_bonus !== null
                  ? sale?.today_bonus.toFixed(2)
                  : "0.00"}
              </div>
              {sale?.today_bonus_date && (
                <div className="text-xs text-muted-foreground mt-1">
                  Date: {formatDisplayDate(sale.today_bonus_date)}
                </div>
              )}
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
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Balance</FormLabel>
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
                name="total_earning"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Earnings</FormLabel>
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
                name="trial_bonus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trial Bonus</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={field.value === null ? "" : field.value}
                        onChange={(e) => {
                          const value =
                            e.target.value === ""
                              ? null
                              : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trial_bonus_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trial Bonus Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value || ""}
                        onChange={(e) => {
                          field.onChange(e.target.value || null);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="today_bonus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Today&apos;s Bonus</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={field.value === null ? "" : field.value}
                        onChange={(e) => {
                          const value =
                            e.target.value === ""
                              ? null
                              : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="today_bonus_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Today&apos;s Bonus Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value || ""}
                        onChange={(e) => {
                          field.onChange(e.target.value || null);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="number_of_rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Ratings</FormLabel>
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
