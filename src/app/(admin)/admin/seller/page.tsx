/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  deleteSeller,
  getAllSeller,
  getSellersByAdmin,
} from "@/lib/actions/seller.action";
import {
  getUserTasksById,
  updateTaskProgress,
  updateTask,
} from "@/lib/actions/task.action";
import { getTaskSettingsById } from "@/lib/actions/task-settings.action";
import { getProductById } from "@/lib/actions/product.action";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
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

export default function SellerPage() {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sellerToDelete, setSellerToDelete] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const pageSize = 10;

  // New state for task dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [sellerTasks, setSellerTasks] = useState<Task | null>(null);
  const [taskSettings, setTaskSettings] = useState<Record<string, any>>({});
  const [taskProducts, setTaskProducts] = useState<Record<string, Product>>({});
  const [isTaskLoading, setIsTaskLoading] = useState(false);

  useEffect(() => {
    fetchSellers();
  }, [page, keyword, user]);

  async function fetchSellers() {
    setIsLoading(true);
    try {
      let response;

      // Use the user ID from the current authenticated user
      if (user && user.$id) {
        response = await getSellersByAdmin(user.$id, page, pageSize, keyword);
      } else {
        response = await getAllSeller(page, pageSize, keyword);
      }

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

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0); // Reset to first page when searching
    fetchSellers();
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Sellers
        </h2>
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
                          <Link href={`/admin/seller/${seller.$id}/sales`}>
                            <Button variant="outline" size="sm">
                              Sales
                            </Button>
                          </Link>
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

      {/* Delete Confirmation Dialog */}
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
