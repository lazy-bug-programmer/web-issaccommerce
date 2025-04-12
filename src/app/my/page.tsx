"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserSales } from "@/lib/appwrite/actions/sales.action";
import {
  createWithdrawal,
  getUserWithdrawals,
} from "@/lib/appwrite/actions/withdrawal.action";
import { useAuth } from "@/lib/auth-context";
import { updateUserInfo } from "@/lib/appwrite/actions/auth.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define a type for the sale
type Sale = {
  $id: string;
  user_id: string;
  task_complete: number;
  total_sales: number;
  $createdAt: string;
};

// Define a type for withdrawal
type Withdrawal = {
  $id: string;
  user_id: string;
  requested_at: Date;
  status: number;
};

export default function MyPage() {
  const { user } = useAuth();
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [hasPendingWithdrawal, setHasPendingWithdrawal] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  // Profile update state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchSales();
    fetchWithdrawals();

    // Initialize form with user data when available
    if (user) {
      setName(user.name || "");
      // Remove the +6 prefix if present for display
      setPhone(
        user.phone?.startsWith("+6")
          ? user.phone.substring(2)
          : user.phone || ""
      );
    }
  }, [user]);

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

  async function fetchWithdrawals() {
    try {
      const response = await getUserWithdrawals();
      if (response.error) {
        console.error("Error fetching withdrawals:", response.error);
        return;
      }

      if (response.data && response.data.length > 0) {
        const withdrawalData = response.data as unknown as Withdrawal[];

        // Sort withdrawals by requested_at date (newest first)
        const sortedWithdrawals = [...withdrawalData].sort((a, b) => {
          const dateA = new Date(a.requested_at).getTime();
          const dateB = new Date(b.requested_at).getTime();
          return dateB - dateA; // Descending order (newest first)
        });

        setWithdrawals(sortedWithdrawals);

        // Check if there's at least one pending withdrawal (status = 1)
        const pendingWithdrawals = withdrawalData.filter(
          (withdrawal) => withdrawal.status === 1
        );
        setHasPendingWithdrawal(pendingWithdrawals.length > 0);
      } else {
        setWithdrawals([]);
        setHasPendingWithdrawal(false);
      }
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
    }
  }

  function formatDate(dateString: string | Date) {
    return new Date(dateString).toLocaleString();
  }

  function getStatusBadge(status: number) {
    switch (status) {
      case 1:
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case 2:
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
            Approved
          </span>
        );
      case 3:
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to update your profile");
      return;
    }

    setIsUpdating(true);
    try {
      const response = await updateUserInfo(user.$id, name, phone);

      if (response.success) {
        toast.success(response.message);
      } else {
        toast.error(response.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleWithdrawal() {
    if (!user) {
      toast.error("You must be logged in to request a withdrawal");
      return;
    }

    if (!sale || sale.total_sales <= 0) {
      toast.error("You have no funds to withdraw");
      return;
    }

    // Only disallow new withdrawal if there is a pending one (status = 1)
    if (hasPendingWithdrawal) {
      toast.error("You already have a pending withdrawal request");
      return;
    }

    setIsWithdrawing(true);
    try {
      const response = await createWithdrawal();

      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success("Withdrawal request submitted successfully");
        // Refresh data
        await fetchSales();
        await fetchWithdrawals();
      }
    } catch (error) {
      console.error("Error requesting withdrawal:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsWithdrawing(false);
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          My Dashboard
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading sales data...</p>
        </div>
      ) : (
        <>
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Sales Overview</h3>
              <Button
                variant="outline"
                onClick={handleWithdrawal}
                disabled={
                  isWithdrawing ||
                  !sale ||
                  sale.total_sales <= 0 ||
                  hasPendingWithdrawal
                }
                title={
                  hasPendingWithdrawal
                    ? "You already have a pending withdrawal request"
                    : ""
                }
              >
                {isWithdrawing ? "Processing..." : "Request Withdrawal"}
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Sales
                  </CardTitle>
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
          </div>

          {/* Withdrawal History Section */}
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-4">Withdrawal History</h3>
            {withdrawals.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date Requested</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.$id}>
                        <TableCell>
                          {formatDate(withdrawal.requested_at)}
                        </TableCell>
                        <TableCell>
                          ${sale?.total_sales.toFixed(2) || "N/A"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(withdrawal.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Card>
                <CardContent className="py-4 text-center text-muted-foreground">
                  No withdrawal history available
                </CardContent>
              </Card>
            )}
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Account Settings</h3>
            <Card>
              <CardHeader>
                <CardTitle>Update Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex items-center">
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Phone number"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? "Updating..." : "Update Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
