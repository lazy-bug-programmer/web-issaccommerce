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
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Plus, Trash, Users } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  adminCreateReferralCode,
  getReferralCodes,
} from "@/lib/actions/referral-code.action";
import {
  getAdmins,
  createAdmin,
  deleteAdmin,
  updateAdmin,
} from "@/lib/actions/admin.action";
import { getSellersByReferralCode } from "@/lib/actions/seller.action";

// Create a schema for admin creation
const formSchema = z
  .object({
    name: z.string().min(2, {
      message: "Name must be at least 2 characters",
    }),
    phone: z.string().min(6, {
      message: "Please enter a valid phone number",
    }),
    password: z.string().min(6, {
      message: "Password must be at least 6 characters",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Schema for editing admin (password is optional)
const editFormSchema = z
  .object({
    name: z.string().min(2, {
      message: "Name must be at least 2 characters",
    }),
    phone: z.string().min(10, {
      message: "Please enter a valid phone number",
    }),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.password || data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Admin interface
interface Admin {
  $id: string;
  name: string;
  phone: string;
  role: string;
  referralCode?: string;
}

// Seller interface
interface Seller {
  $id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  $createdAt: string;
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<string | null>(null);
  const [adminToEdit, setAdminToEdit] = useState<Admin | null>(null);
  const [sellersDialogOpen, setSellersDialogOpen] = useState(false);
  const [currentAdminName, setCurrentAdminName] = useState("");
  const [currentAdminCode, setCurrentAdminCode] = useState("");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const pageSize = 10;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
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
    fetchAdmins();
  }, [page]);

  async function fetchAdmins() {
    setIsLoading(true);
    try {
      const response = await getAdmins(pageSize, page * pageSize);
      if (response.data) {
        const adminData = response.data as unknown as Admin[];

        // Get referral codes for each admin
        const adminsWithCodes = await Promise.all(
          adminData.map(async (admin) => {
            const codesResponse = await getReferralCodes(1, 0, admin.$id);
            const referralCode =
              codesResponse.data && codesResponse.data.length > 0
                ? codesResponse.data[0].code
                : "No code";

            return {
              ...admin,
              referralCode,
            };
          })
        );

        setAdmins(adminsWithCodes);
        setTotalPages(Math.ceil((response.total || 0) / pageSize));
      } else if (response.error) {
        toast.error(response.error);
      } else {
        toast.error("Failed to fetch admin accounts");
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("Failed to fetch admin accounts");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);

      // Create admin user
      const response = await createAdmin(
        values.name,
        values.phone,
        values.password
      );

      if (response.error) {
        toast.error(response.error);
        return;
      }

      const userId = response.user_id;

      if (!userId) {
        toast.error("Failed to create admin account - no user ID returned");
        return;
      }

      // Create referral code for the new admin
      const referralResponse = await adminCreateReferralCode(userId);

      if (referralResponse.error) {
        toast.error(
          `Admin created but referral code failed: ${referralResponse.error}`
        );
      } else {
        toast.success("Admin account created with referral code");
      }

      fetchAdmins();
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error creating admin:", error);
      toast.error("Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onEditSubmit(values: z.infer<typeof editFormSchema>) {
    if (!adminToEdit) return;

    try {
      setIsSubmitting(true);

      const response = await updateAdmin(
        adminToEdit.$id,
        values.name,
        values.phone,
        values.password || undefined
      );

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success("Admin account updated successfully");
      fetchAdmins();
      setEditOpen(false);
      editForm.reset();
    } catch (error) {
      console.error("Error updating admin:", error);
      toast.error("Update failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAddNew() {
    form.reset({
      name: "",
      phone: "",
      password: "",
      confirmPassword: "",
    });
    setOpen(true);
  }

  function handleEdit(admin: Admin) {
    setAdminToEdit(admin);
    editForm.reset({
      name: admin.name,
      phone: admin.phone,
      password: "",
      confirmPassword: "",
    });
    setEditOpen(true);
  }

  function handleDelete(id: string) {
    setAdminToDelete(id);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!adminToDelete) return;

    try {
      const response = await deleteAdmin(adminToDelete);
      if (response.error) {
        toast.error(response.error);
        return;
      }
      toast.success("Admin account deleted successfully");
      fetchAdmins();
    } catch {
      toast.error("Failed to delete admin account");
    } finally {
      setDeleteDialogOpen(false);
      setAdminToDelete(null);
    }
  }

  async function handleViewSellers(admin: Admin) {
    if (!admin.referralCode || admin.referralCode === "No code") {
      toast.error("This admin doesn't have a referral code");
      return;
    }

    setCurrentAdminName(admin.name);
    setCurrentAdminCode(admin.referralCode);
    setSellersDialogOpen(true);
    setLoadingSellers(true);

    try {
      const response = await getSellersByReferralCode(admin.referralCode);
      if (response.error) {
        toast.error(response.error);
        setSellers([]);
      } else {
        setSellers((response.sellers as unknown as Seller[]) || []);
      }
    } catch (error) {
      console.error("Error fetching sellers:", error);
      toast.error("Failed to fetch sellers");
      setSellers([]);
    } finally {
      setLoadingSellers(false);
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Admins
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Admin Account</DialogTitle>
              <DialogDescription>
                Create a new admin account with a referral code
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Admin Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="(123) 456-7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Admin"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Admin Account</DialogTitle>
            <DialogDescription>
              Update the admin account information
            </DialogDescription>
          </DialogHeader>

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
                      <Input placeholder="Admin Name" {...field} />
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
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="(123) 456-7890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password (Optional)</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
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
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Admin"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Sellers Dialog */}
      <Dialog open={sellersDialogOpen} onOpenChange={setSellersDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>
              Sellers for {currentAdminName} (Code: {currentAdminCode})
            </DialogTitle>
            <DialogDescription>
              These are the sellers who used this admin&apos;s referral code
            </DialogDescription>
          </DialogHeader>

          {loadingSellers ? (
            <div className="flex justify-center items-center h-48">
              <p>Loading sellers...</p>
            </div>
          ) : (
            <>
              {sellers.length === 0 ? (
                <div className="text-center py-8">
                  <p>No sellers have used this referral code yet.</p>
                </div>
              ) : (
                <div className="rounded-md border max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellers.map((seller) => (
                        <TableRow key={seller.$id}>
                          <TableCell className="font-medium">
                            {seller.name}
                          </TableCell>
                          <TableCell>{seller.phone}</TableCell>
                          <TableCell>{seller.status}</TableCell>
                          <TableCell>
                            {new Date(seller.$createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button onClick={() => setSellersDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading admin accounts...</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Referral Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No admin accounts found. Create your first admin!
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin) => (
                    <TableRow key={admin.$id}>
                      <TableCell className="font-medium">
                        {admin.name}
                      </TableCell>
                      <TableCell>{admin.phone}</TableCell>
                      <TableCell>{admin.role}</TableCell>
                      <TableCell>{admin.referralCode}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleViewSellers(admin)}
                            title="View Sellers"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(admin)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => admin.$id && handleDelete(admin.$id)}
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
              admin account from our servers.
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
