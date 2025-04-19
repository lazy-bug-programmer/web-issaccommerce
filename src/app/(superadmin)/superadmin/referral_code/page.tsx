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
import { Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash } from "lucide-react";
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
import { ReferralCode } from "@/lib/domains/referral-codes.domain";
import {
  adminCreateReferralCode,
  adminDeleteReferralCode,
  getReferralCodes,
} from "@/lib/actions/referral-code.action";

// Create a schema for referral codes - empty schema as we're not using any fields in the form
const formSchema = z.object({});

// Extended referral code with additional attributes
interface ExtendedReferralCode extends ReferralCode {
  user_id?: string | null; // Keep this for status display only
}

export default function ReferralCodePage() {
  const [referralCodes, setReferralCodes] = useState<ExtendedReferralCode[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState<string | null>(null);
  const pageSize = 10;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  useEffect(() => {
    fetchReferralCodes();
  }, [page]);

  async function fetchReferralCodes() {
    setIsLoading(true);
    try {
      const response = await getReferralCodes(pageSize, page * pageSize);
      if (response.data) {
        // Cast the response to include user_id which might be in backend but not in domain model
        const codes = response.data as unknown as Array<
          ReferralCode & { user_id?: string | null }
        >;

        const extendedCodes: ExtendedReferralCode[] = codes.map((code) => ({
          $id: code.$id,
          code: code.code,
          belongs_to: code.belongs_to,
          user_id: code.user_id,
        }));

        setReferralCodes(extendedCodes);
        setTotalPages(Math.ceil((response.total || 0) / pageSize));
      } else if (response.error) {
        toast.error(response.error);
      } else {
        toast.error("Failed to fetch referral codes");
      }
    } catch (error) {
      console.error("Error fetching referral codes:", error);
      toast.error("Failed to fetch referral codes");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit() {
    try {
      setIsSubmitting(true);

      const response = await adminCreateReferralCode();

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success("Referral code created successfully");
      fetchReferralCodes();
      setOpen(false);
      form.reset();
    } catch {
      toast.error("Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAddNew() {
    form.reset({});
    setOpen(true);
  }

  function handleDelete(id: string) {
    setCodeToDelete(id);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!codeToDelete) return;

    try {
      const response = await adminDeleteReferralCode(codeToDelete);
      if (response.error) {
        toast.error(response.error);
        return;
      }
      toast.success("Referral code deleted successfully");
      fetchReferralCodes();
    } catch {
      toast.error("Failed to delete referral code");
    } finally {
      setDeleteDialogOpen(false);
      setCodeToDelete(null);
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Referral Codes
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Generate Code
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Generate Referral Code</DialogTitle>
              <DialogDescription>
                Generate a new referral code for your system
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Generate code"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading referral codes...</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralCodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8">
                      No referral codes found. Generate your first code!
                    </TableCell>
                  </TableRow>
                ) : (
                  referralCodes.map((code) => (
                    <TableRow key={code.$id}>
                      <TableCell className="font-medium">{code.code}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => code.$id && handleDelete(code.$id)}
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
              referral code from our servers.
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
