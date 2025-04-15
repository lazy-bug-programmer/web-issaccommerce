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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Plus, Trash, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useParams, useRouter } from "next/navigation";
import {
  createShipment,
  deleteShipment,
  getShipments,
  updateShipment,
} from "@/lib/actions/shipments.action";
import { getProducts } from "@/lib/actions/product.action";
import { getShipmentAutomations } from "@/lib/actions/shipment-automations.action";

// Define a type for the shipment
type Shipment = {
  $id: string;
  user_id: string;
  shipment_automation_id: string;
  customer_name: string;
  product_id: string;
  order_date: string;
  $createdAt: string;
};

// Define a type for product
type Product = {
  $id: string;
  name: string;
  price: number;
};

// Define a type for shipment automation
type ShipmentAutomation = {
  $id: string;
  name: string;
  progress: string;
};

// Create a schema for shipment form
const formSchema = z.object({
  shipment_automation_id: z.string({
    required_error: "Please select a shipment automation",
  }),
  customer_name: z.string().min(2, {
    message: "Customer name must be at least 2 characters",
  }),
  product_id: z.string({
    required_error: "Please select a product",
  }),
  order_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Please enter a valid date",
  }),
});

export default function SellerShipmentsPage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = params.id as string;

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shipmentAutomations, setShipmentAutomations] = useState<
    ShipmentAutomation[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingAutomations, setIsLoadingAutomations] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentShipment, setCurrentShipment] = useState<Shipment | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shipmentToDelete, setShipmentToDelete] = useState<string | null>(null);
  const pageSize = 10;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shipment_automation_id: "",
      customer_name: "",
      product_id: "",
      order_date: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (sellerId) {
      fetchShipments();
      fetchProducts();
      fetchShipmentAutomations();
    }
  }, [sellerId, page]);

  async function fetchShipments() {
    setIsLoading(true);
    try {
      const response = await getShipments();

      if (response && response.data) {
        const sellerShipments = response.data.filter(
          (shipment: any) => shipment.user_id === sellerId
        );
        setShipments(sellerShipments as unknown as Shipment[]);
        setTotalPages(Math.ceil(sellerShipments.length / pageSize));
      } else {
        toast.error("Failed to fetch shipments");
      }
    } catch (error) {
      console.error("Error fetching shipments:", error);
      toast.error("Failed to fetch shipments");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchProducts() {
    setIsLoadingProducts(true);
    try {
      const response = await getProducts(100);

      if (response && response.data) {
        setProducts(response.data as unknown as Product[]);
      } else {
        toast.error("Failed to fetch products");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to fetch products");
    } finally {
      setIsLoadingProducts(false);
    }
  }

  async function fetchShipmentAutomations() {
    setIsLoadingAutomations(true);
    try {
      const response = await getShipmentAutomations(100);

      if (response && response.data) {
        setShipmentAutomations(
          response.data as unknown as ShipmentAutomation[]
        );
      } else {
        toast.error("Failed to fetch shipment automations");
      }
    } catch (error) {
      console.error("Error fetching shipment automations:", error);
      toast.error("Failed to fetch shipment automations");
    } finally {
      setIsLoadingAutomations(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);

      if (isEditing && currentShipment) {
        const response = await updateShipment(currentShipment.$id, {
          user_id: sellerId,
          shipment_automation_id: values.shipment_automation_id,
          customer_name: values.customer_name,
          product_id: values.product_id,
          order_date: new Date(values.order_date),
        });

        if (response.error) {
          toast.error(response.error);
          return;
        }

        toast.success("Shipment updated successfully");
      } else {
        const response = await createShipment({
          user_id: sellerId,
          shipment_automation_id: values.shipment_automation_id,
          customer_name: values.customer_name,
          product_id: values.product_id,
          order_date: new Date(values.order_date),
        });

        if (response.error) {
          toast.error(response.error);
          return;
        }

        toast.success("Shipment added successfully");
      }

      fetchShipments();
      setOpen(false);
      form.reset();
      setIsEditing(false);
      setCurrentShipment(null);
    } catch {
      toast.error(
        isEditing ? "Failed to update shipment" : "Failed to add shipment"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(shipment: Shipment) {
    setIsEditing(true);
    setCurrentShipment(shipment);

    const formattedDate = new Date(shipment.order_date)
      .toISOString()
      .split("T")[0];

    form.reset({
      shipment_automation_id: shipment.shipment_automation_id,
      customer_name: shipment.customer_name,
      product_id: shipment.product_id,
      order_date: formattedDate,
    });

    setOpen(true);
  }

  function handleAddNew() {
    setIsEditing(false);
    setCurrentShipment(null);
    form.reset({
      shipment_automation_id: "",
      customer_name: "",
      product_id: "",
      order_date: new Date().toISOString().split("T")[0],
    });
    setOpen(true);
  }

  function handleDelete(id: string) {
    setShipmentToDelete(id);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!shipmentToDelete) return;

    try {
      const response = await deleteShipment(shipmentToDelete);
      if (response.error) {
        toast.error(response.error);
        return;
      }
      toast.success("Shipment deleted successfully");
      fetchShipments();
    } catch {
      toast.error("Failed to delete shipment");
    } finally {
      setDeleteDialogOpen(false);
      setShipmentToDelete(null);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function getProductName(productId: string) {
    const product = products.find((p) => p.$id === productId);
    return product ? product.name : productId;
  }

  function getShipmentAutomationName(automationId: string) {
    const automation = shipmentAutomations.find((a) => a.$id === automationId);
    return automation ? automation.name : automationId;
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
            Seller Shipments
          </h2>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add Shipment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edit Shipment" : "Add Shipment"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Edit the shipment details below"
                  : "Add a new shipment to this seller"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="shipment_automation_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipment Automation</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a shipment automation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingAutomations ? (
                            <SelectItem value="loading" disabled>
                              Loading automations...
                            </SelectItem>
                          ) : shipmentAutomations.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No automations available
                            </SelectItem>
                          ) : (
                            shipmentAutomations.map((automation) => (
                              <SelectItem
                                key={automation.$id}
                                value={automation.$id}
                              >
                                {automation.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="product_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingProducts ? (
                            <SelectItem value="loading" disabled>
                              Loading products...
                            </SelectItem>
                          ) : products.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No products available
                            </SelectItem>
                          ) : (
                            products.map((product) => (
                              <SelectItem key={product.$id} value={product.$id}>
                                {product.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="order_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? isEditing
                        ? "Saving..."
                        : "Adding..."
                      : isEditing
                      ? "Save changes"
                      : "Add shipment"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading shipments...</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment Automation</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-right w-[180px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No shipments found for this seller.
                    </TableCell>
                  </TableRow>
                ) : (
                  shipments
                    .slice(page * pageSize, (page + 1) * pageSize)
                    .map((shipment) => (
                      <TableRow key={shipment.$id}>
                        <TableCell className="font-medium">
                          {getShipmentAutomationName(
                            shipment.shipment_automation_id
                          )}
                        </TableCell>
                        <TableCell>{shipment.customer_name}</TableCell>
                        <TableCell>
                          {getProductName(shipment.product_id)}
                        </TableCell>
                        <TableCell>{formatDate(shipment.order_date)}</TableCell>
                        <TableCell>{formatDate(shipment.$createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEdit(shipment)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDelete(shipment.$id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  {page > 0 ? (
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(p - 1, 0))}
                    />
                  ) : (
                    <PaginationPrevious className="pointer-events-none opacity-50" />
                  )}
                </PaginationItem>
                <PaginationItem>
                  Page {page + 1} of {totalPages}
                </PaginationItem>
                <PaginationItem>
                  {page < totalPages - 1 ? (
                    <PaginationNext
                      onClick={() =>
                        setPage((p) => Math.min(p + 1, totalPages - 1))
                      }
                    />
                  ) : (
                    <PaginationNext className="pointer-events-none opacity-50" />
                  )}
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              shipment from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
