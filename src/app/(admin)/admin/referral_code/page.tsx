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
import { ReferralCode } from "@/lib/domains/referral-codes.domain";
import {
  adminCreateReferralCode,
  adminDeleteReferralCode,
  adminUpdateReferralCode,
  getReferralCodes,
} from "@/lib/actions/referral-code.action";
import { getUserById } from "@/lib/actions/auth.action";
import { Badge } from "@/components/ui/badge";

// Create a schema for adding referral codes
const formSchema = z.object({
  user_id: z.string().optional().nullable(),
});

// Interface for user info
interface UserInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
}

// Extended referral code with user info
interface ReferralCodeWithUser extends ReferralCode {
  userInfo?: UserInfo;
}

export default function ReferralCodePage() {
  const [referralCodes, setReferralCodes] = useState<ReferralCodeWithUser[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentReferralCode, setCurrentReferralCode] =
    useState<ReferralCode | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState<string | null>(null);
  const pageSize = 10;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      user_id: null,
    },
  });

  useEffect(() => {
    fetchReferralCodes();
  }, [page]);

  async function fetchReferralCodes() {
    setIsLoading(true);
    try {
      const response = await getReferralCodes(pageSize, page * pageSize);
      if (response.data) {
        const codes = response.data as unknown as ReferralCode[];
        const codesWithUserInfo: ReferralCodeWithUser[] = [];

        for (const code of codes) {
          const codeWithUser: ReferralCodeWithUser = { ...code };

          // Fetch user info if user_id exists
          if (code.user_id) {
            try {
              const userResponse = await getUserById(code.user_id);
              if (userResponse.success && userResponse.user) {
                codeWithUser.userInfo = userResponse.user;
              }
            } catch (error) {
              console.error(
                `Error fetching user for ID ${code.user_id}:`,
                error
              );
            }
          }

          codesWithUserInfo.push(codeWithUser);
        }

        setReferralCodes(codesWithUserInfo);
        setTotalPages(Math.ceil((response.total || 0) / pageSize));
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);

      if (isEditing && currentReferralCode && currentReferralCode.$id) {
        // Update existing referral code
        const response = await adminUpdateReferralCode(
          currentReferralCode.$id,
          { user_id: values.user_id || null, code: currentReferralCode.code }
        );

        if (response.error) {
          toast.error(response.error);
          return;
        }

        toast.success("Referral code updated successfully");
      } else {
        // Create new referral code
        const response = await adminCreateReferralCode(
          values.user_id || undefined
        );

        if (response.error) {
          toast.error(response.error);
          return;
        }

        toast.success("Referral code created successfully");
      }

      fetchReferralCodes();
      setOpen(false);
      form.reset();
      setIsEditing(false);
      setCurrentReferralCode(null);
    } catch {
      toast.error("Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(referralCode: ReferralCode) {
    setIsEditing(true);
    setCurrentReferralCode(referralCode);
    form.reset({
      user_id: referralCode.user_id || null,
    });
    setOpen(true);
  }

  function handleAddNew() {
    setIsEditing(false);
    setCurrentReferralCode(null);
    form.reset({
      user_id: null,
    });
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
              <DialogTitle>
                {isEditing ? "Edit Referral Code" : "Generate Referral Code"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Edit the referral code details below"
                  : "Generate a new referral code for your system"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User ID (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter user ID or leave blank"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? "Saving..."
                      : isEditing
                      ? "Save changes"
                      : "Generate code"}
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
                  <TableHead>Status</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralCodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No referral codes found. Generate your first code!
                    </TableCell>
                  </TableRow>
                ) : (
                  referralCodes.map((code) => (
                    <TableRow key={code.$id}>
                      <TableCell className="font-medium">{code.code}</TableCell>
                      <TableCell>
                        {code.user_id ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Redeemed
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                            Available
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {code.userInfo
                          ? code.userInfo.name
                          : code.user_id
                          ? code.user_id
                          : "Not assigned"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(code)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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
