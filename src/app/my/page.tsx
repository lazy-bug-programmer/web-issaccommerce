"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getUserSales,
  createSale,
  updateSale,
} from "@/lib/actions/sales.action";
import {
  createWithdrawal,
  getUserWithdrawals,
} from "@/lib/actions/withdrawal.action";
import { useAuth } from "@/lib/auth-context";
import { updateUserInfo, updateUserPassword } from "@/lib/actions/auth.action";
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
import { Sale } from "@/lib/domains/sales.domain";
import { Withdrawal } from "@/lib/domains/withdrawal.domain";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function MyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [balance, setBalance] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [hasPendingWithdrawal, setHasPendingWithdrawal] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isCreatingSales, setIsCreatingSales] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>("");
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);

  // Profile update state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Password update state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    fetchBalance();
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

  async function fetchBalance() {
    setIsLoading(true);
    try {
      // First, check if we already have a record or if we're currently creating one
      if (isCreatingSales) {
        return; // Exit early if a creation is already in progress
      }

      const response = await getUserSales();

      if (response && response.data) {
        if (response.data.length > 0) {
          const salesData = response.data[0] as unknown as Sale;

          // Check if today_bonus_date is not today, if so reset it
          if (
            salesData.today_bonus_date &&
            !isToday(salesData.today_bonus_date)
          ) {
            // Reset only today's bonus if date is not today
            try {
              // Important: Only include the specific fields we want to update
              // This ensures other fields like balance, total_earning, etc. aren't affected
              const updateResult = await updateSale(salesData.$id, {
                today_bonus: 0,
                today_bonus_date: new Date(),
              });

              if (updateResult.data) {
                // Preserve all other fields from the original data
                const updatedSalesData = {
                  ...salesData,
                  today_bonus: 0,
                  today_bonus_date: new Date(),
                };
                setBalance(updatedSalesData);
              } else {
                setBalance(salesData);
              }
            } catch (updateError) {
              console.error("Error resetting today's bonus:", updateError);
              setBalance(salesData);
            }
          } else {
            setBalance(salesData);
          }
        } else {
          // No sales record found, create a new one
          if (user && !isCreatingSales) {
            setIsCreatingSales(true); // Set flag to prevent multiple creation attempts

            const currentDate = new Date();
            const newSale: Sale = {
              $id: "",
              user_id: user.$id,
              balance: 0,
              number_of_rating: 0,
              total_earning: 0,
              trial_bonus: 300,
              trial_bonus_date: currentDate,
              today_bonus: 0,
              today_bonus_date: currentDate,
            };

            try {
              const createResponse = await createSale(newSale);

              if (createResponse.error) {
                toast.error("Failed to create balance record");
              } else {
                toast.success("Balance record created successfully");
                // Fetch balance again after creating
                const refreshResponse = await getUserSales();
                if (
                  refreshResponse &&
                  refreshResponse.data &&
                  refreshResponse.data.length > 0
                ) {
                  setBalance(refreshResponse.data[0] as unknown as Sale);
                } else {
                  setBalance(null);
                }
              }
            } catch (createError) {
              console.error("Error creating sales record:", createError);
              toast.error("Failed to create balance record");
            } finally {
              setIsCreatingSales(false); // Reset the flag regardless of outcome
            }
          } else {
            setBalance(null);
          }
        }
      } else {
        toast.error("Failed to fetch balance data");
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      toast.error("Failed to fetch balance data");
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

  function isToday(date: Date | string): boolean {
    const today = new Date();
    const compareDate = new Date(date);

    return (
      compareDate.getDate() === today.getDate() &&
      compareDate.getMonth() === today.getMonth() &&
      compareDate.getFullYear() === today.getFullYear()
    );
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

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to update your password");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const response = await updateUserPassword(user.$id, newPassword);

      if (response.success) {
        toast.success(response.message);
        // Clear form fields after successful update
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordForm(false);
      } else {
        toast.error(response.error || "Failed to update password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  async function handleWithdrawal() {
    if (!user) {
      toast.error("You must be logged in to request a withdrawal");
      return;
    }

    // Check if balance is available
    if (!balance || balance.balance <= 0) {
      toast.error("You have no balance available to withdraw");
      return;
    }

    // Only disallow new withdrawal if there is a pending one (status = 1)
    if (hasPendingWithdrawal) {
      toast.error("You already have a pending withdrawal request");
      return;
    }

    // Open withdrawal dialog instead of immediately processing
    setWithdrawalAmount(balance.balance.toString());
    setWithdrawDialogOpen(true);
  }

  async function processWithdrawal() {
    // Validate the withdrawal amount
    const amount = parseFloat(withdrawalAmount);

    if (isNaN(amount)) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount <= 0) {
      toast.error("Withdrawal amount must be greater than 0");
      return;
    }

    if (!balance || amount > balance.balance) {
      toast.error("Withdrawal amount cannot exceed your available balance");
      return;
    }

    setIsWithdrawing(true);
    try {
      // Use the validated amount instead of the full balance
      const response = await createWithdrawal(amount);

      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success("Withdrawal request submitted successfully");
        setWithdrawDialogOpen(false);
        // Refresh data
        await fetchBalance();
        await fetchWithdrawals();
      }
    } catch (error) {
      console.error("Error requesting withdrawal:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsWithdrawing(false);
    }
  }

  async function handleDeposit() {
    if (!user) {
      toast.error("You must be logged in to make a deposit");
      return;
    }

    setIsDepositing(true);
    try {
      // Redirect to contact page
      router.push("/contact");
    } catch (error) {
      console.error("Error redirecting:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDepositing(false);
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
          <p>Loading balance data...</p>
        </div>
      ) : (
        <>
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Balance Overview</h3>
              <div className="space-x-2">
                <Button
                  variant="default"
                  onClick={handleDeposit}
                  disabled={isDepositing}
                >
                  {isDepositing ? "Processing..." : "Deposit Funds"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleWithdrawal}
                  disabled={
                    isWithdrawing ||
                    !balance ||
                    balance.balance <= 0 ||
                    hasPendingWithdrawal
                  }
                  title={
                    hasPendingWithdrawal
                      ? "You already have a pending withdrawal request"
                      : !balance || balance.balance <= 0
                      ? "You have no balance available to withdraw"
                      : "Withdraw your available balance"
                  }
                >
                  {isWithdrawing ? "Processing..." : "Request Withdrawal"}
                </Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ৳{balance?.balance.toFixed(2) || "0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This is the amount available for withdrawal
                  </p>
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
                    ৳{balance?.total_earning.toFixed(2) || "0.00"}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Trial Bonus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ৳
                    {balance?.trial_bonus_date &&
                    isToday(balance.trial_bonus_date)
                      ? balance?.trial_bonus.toFixed(2)
                      : "0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {balance?.trial_bonus_date &&
                    isToday(balance.trial_bonus_date)
                      ? "Available today only"
                      : "No trial bonus available today"}
                  </p>
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
                    {balance?.today_bonus_date &&
                    isToday(balance.today_bonus_date)
                      ? balance?.today_bonus.toFixed(2)
                      : "0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {balance?.today_bonus_date &&
                    isToday(balance.today_bonus_date)
                      ? "Available today only"
                      : "No daily bonus available today"}
                  </p>
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
                    {balance?.number_of_rating || "0"}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Withdrawal Dialog */}
          <Dialog
            open={withdrawDialogOpen}
            onOpenChange={setWithdrawDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Withdrawal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="withdrawal-amount">Withdrawal Amount</Label>
                  <Input
                    id="withdrawal-amount"
                    type="number"
                    step="0.01"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    min="0.01"
                    max={balance?.balance}
                    placeholder="Enter amount"
                  />
                  <p className="text-sm text-muted-foreground">
                    Available balance: ৳{balance?.balance.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setWithdrawDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={processWithdrawal} disabled={isWithdrawing}>
                  {isWithdrawing ? "Processing..." : "Confirm Withdrawal"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                          ৳{withdrawal.withdraw_amount.toFixed(2) || "0.00"}
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

            {/* Profile Update Card */}
            <Card className="mb-4">
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

            {/* Password Update Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Update Password</CardTitle>
                {!showPasswordForm && (
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordForm(true)}
                  >
                    Change Password
                  </Button>
                )}
              </CardHeader>
              {showPasswordForm && (
                <CardContent>
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        minLength={8}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isUpdatingPassword}>
                        {isUpdatingPassword ? "Updating..." : "Update Password"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
