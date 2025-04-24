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
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Plus, Trash } from "lucide-react";
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
import {
  createSeller,
  deleteSeller,
  getAllSeller,
  updateSeller,
} from "@/lib/actions/seller.action";
import Link from "next/link";
import {
  getUserTasksById,
  updateTaskProgress,
  updateTask,
} from "@/lib/actions/task.action";
import { getTaskSettingsById } from "@/lib/actions/task-settings.action";
import { getProductById } from "@/lib/actions/product.action";
import { Task } from "@/lib/domains/task.domain";
import { Product } from "@/lib/domains/products.domain";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

// Define a type for the seller
type Seller = {
  $id: string;
  name: string;
  email: string;
  status: string;
  phone: string;
  labels: string[];
  $createdAt: string;
};

// Create a schema for adding/updating sellers
const formSchema = z
  .object({
    name: z.string().min(2, {
      message: "Name must be at least 2 characters",
    }),
    email: z.string().email({
      message: "Please enter a valid email address",
    }),
    password: z.string().min(8, {
      message: "Password must be at least 8 characters",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Create a schema for editing sellers (with optional password fields)
const editFormSchema = z
  .object({
    name: z.string().min(2, {
      message: "Name must be at least 2 characters",
    }),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, {
        message: "Password must be at least 8 characters",
      })
      .optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      // Only validate confirmPassword if password is provided
      if (data.password && data.password !== data.confirmPassword) {
        return false;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  );

export default function SellerPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSeller, setCurrentSeller] = useState<Seller | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sellerToDelete, setSellerToDelete] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [sellerTasks, setSellerTasks] = useState<Task | null>(null);
  const [taskSettings, setTaskSettings] = useState<Record<string, any>>({});
  const [taskProducts, setTaskProducts] = useState<Record<string, Product>>({});
  const [isTaskLoading, setIsTaskLoading] = useState(false);
  const pageSize = 10;

  // Use different form schemas for add/edit
  const addForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    fetchSellers();
  }, [page, keyword]);

  async function fetchSellers() {
    setIsLoading(true);
    try {
      const response = await getAllSeller(page, pageSize, keyword);
      if (response && response.users) {
        setSellers(response.users as unknown as Seller[]);
        setTotalPages(Math.ceil(response.total / pageSize));
      } else {
        toast.error("Failed to fetch sellers");
      }
    } catch (error) {
      console.error("Error fetching sellers:", error);
      toast.error("Failed to fetch sellers");
    } finally {
      setIsLoading(false);
    }
  }

  async function onAddSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      const response = await createSeller(
        values.name,
        values.email,
        values.password,
        values.confirmPassword
      );

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success("Seller added successfully");
      fetchSellers();
      setOpen(false);
      addForm.reset();
    } catch {
      toast.error("Failed to add seller");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onEditSubmit(values: z.infer<typeof editFormSchema>) {
    if (!currentSeller) return;

    try {
      setIsSubmitting(true);

      // Only pass password if it's provided
      const response = await updateSeller(
        currentSeller.$id,
        values.name,
        values.phone || undefined,
        values.password || undefined
      );

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success("Seller updated successfully");
      fetchSellers();
      setOpen(false);
      editForm.reset();
      setIsEditing(false);
      setCurrentSeller(null);
    } catch {
      toast.error("Failed to update seller");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(seller: Seller) {
    setIsEditing(true);
    setCurrentSeller(seller);
    editForm.reset({
      name: seller.name || "",
      phone: seller.phone || "",
      password: "",
      confirmPassword: "",
    });
    setOpen(true);
  }

  function handleAddNew() {
    setIsEditing(false);
    setCurrentSeller(null);
    addForm.reset({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setOpen(true);
  }

  function handleDelete(id: string) {
    setSellerToDelete(id);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!sellerToDelete) return;

    try {
      const response = await deleteSeller(sellerToDelete);
      if (response.error) {
        toast.error(response.error);
        return;
      }
      toast.success("Seller deleted successfully");
      fetchSellers();
    } catch {
      toast.error("Failed to delete seller");
    } finally {
      setDeleteDialogOpen(false);
      setSellerToDelete(null);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0); // Reset to first page when searching
    fetchSellers();
  }

  // Function to fetch seller tasks and task settings
  async function fetchSellerTasks(sellerId: string) {
    setIsTaskLoading(true);
    try {
      // Fetch the seller's tasks
      const tasksResponse = await getUserTasksById(sellerId);
      if (tasksResponse.data && tasksResponse.data.length > 0) {
        setSellerTasks(tasksResponse.data[0] as unknown as Task);
      }

      // Fetch task settings to get product assignments
      const settingsResponse = await getTaskSettingsById("task-settings");
      if (settingsResponse.data && settingsResponse.data.settings) {
        const settings = JSON.parse(settingsResponse.data.settings);
        setTaskSettings(settings);

        // Collect all product IDs from the task settings
        const productIds = new Set<string>();
        Object.values(settings).forEach((task: any) => {
          if (task.product_id && task.product_id !== "none") {
            productIds.add(task.product_id);
          }
        });

        // Fetch all needed products in one go
        const productMap: Record<string, Product> = {};
        for (const id of productIds) {
          const productResponse = await getProductById(id);
          if (productResponse.data) {
            productMap[id] = productResponse.data as unknown as Product;
          }
        }
        setTaskProducts(productMap);
      }
    } catch (error) {
      console.error("Error fetching seller tasks:", error);
      toast.error("Failed to fetch task information");
    } finally {
      setIsTaskLoading(false);
    }
  }

  // Function to handle resetting a seller's task progress
  async function resetSellerTaskProgress() {
    if (!sellerTasks || !sellerTasks.$id) return;

    try {
      setIsTaskLoading(true);
      // Reset progress to all false
      const defaultProgress = Object.keys(
        JSON.parse(sellerTasks.progress)
      ).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as Record<string, boolean>);

      const response = await updateTaskProgress(
        sellerTasks.$id,
        JSON.stringify(defaultProgress)
      );

      if (response.data) {
        setSellerTasks(response.data as unknown as Task);
        toast.success("Task progress reset successfully");
      } else if (response.error) {
        toast.error(response.error);
      }
    } catch (error) {
      console.error("Error resetting task progress:", error);
      toast.error("Failed to reset task progress");
    } finally {
      setIsTaskLoading(false);
    }
  }

  // Function to toggle allow_system_reset setting
  async function toggleSystemReset() {
    if (!sellerTasks || !sellerTasks.$id) return;

    try {
      setIsTaskLoading(true);

      // Get the current value and invert it
      const currentSetting = sellerTasks.allow_system_reset ?? true;

      const response = await updateTask(sellerTasks.$id, {
        allow_system_reset: !currentSetting,
      });

      if (response.data) {
        setSellerTasks(response.data as unknown as Task);
        toast.success(
          `Auto-reset ${!currentSetting ? "enabled" : "disabled"} successfully`
        );
      } else if (response.error) {
        toast.error(response.error);
      }
    } catch (error) {
      console.error("Error updating auto-reset setting:", error);
      toast.error("Failed to update auto-reset setting");
    } finally {
      setIsTaskLoading(false);
    }
  }

  // Helper to calculate discounted price
  const getDisplayPrice = (product: Product) => {
    if (!product.price) return "$0.00";

    if (product.discount_rate) {
      const discountedPrice = product.price * (1 - product.discount_rate / 100);
      return `$${discountedPrice.toFixed(2)} (${product.discount_rate}% off)`;
    }

    return `$${product.price.toFixed(2)}`;
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Sellers
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add Seller
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edit Seller" : "Add Seller"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Edit the seller details below"
                  : "Add a new seller to your system"}
              </DialogDescription>
            </DialogHeader>

            {/* Different forms for add/edit operations */}
            {isEditing ? (
              <Form {...editForm}>
                <form
                  onSubmit={editForm.handleSubmit(onEditSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Seller name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">
                      Change Password (Optional)
                    </h4>
                    <div className="space-y-4">
                      <FormField
                        control={editForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="New password"
                                type="password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Confirm new password"
                                type="password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : "Save changes"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            ) : (
              <Form {...addForm}>
                <form
                  onSubmit={addForm.handleSubmit(onAddSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={addForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Seller name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Email address"
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Password"
                            type="password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Confirm password"
                            type="password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Adding..." : "Add seller"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <form
          onSubmit={handleSearch}
          className="flex w-full max-w-sm items-center space-x-2"
        >
          <Input
            type="search"
            placeholder="Search sellers..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Button type="submit">Search</Button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading sellers...</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-right w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No sellers found. Add your first seller!
                    </TableCell>
                  </TableRow>
                ) : (
                  sellers.map((seller) => (
                    <TableRow key={seller.$id}>
                      <TableCell className="font-medium">
                        {seller.name || "Unnamed"}
                      </TableCell>
                      <TableCell>{seller.email}</TableCell>
                      <TableCell>{seller.phone || "N/A"}</TableCell>
                      <TableCell>
                        {seller.labels.includes("ADMIN") ? "Admin" : "Seller"}
                      </TableCell>
                      <TableCell>{formatDate(seller.$createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSeller(seller);
                              setTaskDialogOpen(true);
                              fetchSellerTasks(seller.$id);
                            }}
                          >
                            Tasks
                          </Button>
                          <Link href={`/superadmin/seller/${seller.$id}/sales`}>
                            <Button variant="outline" size="sm">
                              Sales
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(seller)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(seller.$id)}
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
              This action cannot be undone. This will permanently delete the
              seller account and remove all associated data from our servers.
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

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Task Progress for {selectedSeller?.name || "Seller"}
            </DialogTitle>
            <DialogDescription>
              View and manage this seller&apos;s daily tasks
            </DialogDescription>
          </DialogHeader>

          {isTaskLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading task information...</p>
            </div>
          ) : !sellerTasks ? (
            <div className="text-center py-8">
              <p>No task data found for this seller.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Last updated:{" "}
                      {new Date(sellerTasks.last_edit).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={resetSellerTaskProgress}
                  >
                    Reset Progress
                  </Button>
                </div>

                {/* Add system reset toggle */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <h4 className="font-medium">Automatic Daily Reset</h4>
                    <p className="text-sm text-muted-foreground">
                      When enabled, the system will automatically reset this
                      seller&apos;s progress each day
                    </p>
                  </div>
                  <Switch
                    checked={sellerTasks.allow_system_reset ?? true}
                    onCheckedChange={toggleSystemReset}
                    disabled={isTaskLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(JSON.parse(sellerTasks.progress)).map(
                  ([taskKey, completed]) => {
                    const taskSetting = taskSettings[taskKey] || {};
                    const product = taskSetting.product_id
                      ? taskProducts[taskSetting.product_id]
                      : null;

                    return (
                      <Card key={taskKey}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">
                              {taskKey.replace("task", "Task ")}
                            </CardTitle>
                            <div
                              className={
                                completed ? "text-green-500" : "text-red-500"
                              }
                            >
                              {completed ? (
                                <Check className="h-5 w-5" />
                              ) : (
                                <X className="h-5 w-5" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="font-medium">Product:</span>
                              <span>{product ? product.name : "None"}</span>
                            </div>
                            {product && (
                              <div className="flex justify-between">
                                <span className="font-medium">Price:</span>
                                <span>{getDisplayPrice(product)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="font-medium">Amount:</span>
                              <span>{taskSetting.amount || "N/A"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">Status:</span>
                              <span
                                className={
                                  completed ? "text-green-500" : "text-red-500"
                                }
                              >
                                {completed ? "Completed" : "Pending"}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
