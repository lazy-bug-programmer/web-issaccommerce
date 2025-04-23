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
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

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
    </div>
  );
}
