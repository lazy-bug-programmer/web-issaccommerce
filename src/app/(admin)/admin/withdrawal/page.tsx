"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
  adminGetAllWithdrawals,
  adminUpdateWithdrawalStatus,
  getWithdrawalsByAdmin,
} from "@/lib/actions/withdrawal.action";
import { getUserById } from "@/lib/actions/auth.action";
import { getSalesByUserId, updateSale } from "@/lib/actions/sales.action";
import { toast } from "sonner";
import { Check, X, UserRound, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

// Define a type for the withdrawal
type Withdrawal = {
  $id: string;
  user_id: string;
  requested_at: string;
  status: number;
  amount?: number;
  withdraw_amount?: number;
  $createdAt: string;
};

// Type for user data
type UserData = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

// Type for sales data
type SalesData = {
  $id: string;
  user_id: string;
  balance: number;
  number_of_rating: number;
  total_earning: number;
  trial_balance: number | null;
};

export default function WithdrawalPage() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userCache, setUserCache] = useState<Record<string, UserData>>({});
  const [salesCache, setSalesCache] = useState<Record<string, SalesData>>({});
  const [loadingUsers, setLoadingUsers] = useState<Record<string, boolean>>({});
  const [loadingSales, setLoadingSales] = useState<Record<string, boolean>>({});
  const pageSize = 10;

  useEffect(() => {
    fetchWithdrawals();
  }, [page, keyword, user]);

  useEffect(() => {
    // Fetch user details for each withdrawal that we don't have in cache
    const fetchMissingUserDetails = async () => {
      const userIdsToFetch = withdrawals
        .map((w) => w.user_id)
        .filter((id) => !userCache[id] && !loadingUsers[id]);

      if (userIdsToFetch.length === 0) return;

      // Mark these users as loading
      setLoadingUsers((prev) => {
        const newLoadingState = { ...prev };
        userIdsToFetch.forEach((id) => {
          newLoadingState[id] = true;
        });
        return newLoadingState;
      });

      // Fetch user details in parallel
      const userPromises = userIdsToFetch.map(async (userId) => {
        const response = await getUserById(userId);
        if (response.success && response.user) {
          return { userId, userData: response.user };
        }
        return { userId, userData: null };
      });

      const results = await Promise.all(userPromises);

      // Update cache with results
      const newCacheEntries: Record<string, UserData> = {};
      results.forEach((result) => {
        if (result.userData) {
          newCacheEntries[result.userId] = result.userData;
        }
      });

      setUserCache((prev) => ({ ...prev, ...newCacheEntries }));

      // Mark these users as no longer loading
      setLoadingUsers((prev) => {
        const newLoadingState = { ...prev };
        userIdsToFetch.forEach((id) => {
          delete newLoadingState[id];
        });
        return newLoadingState;
      });
    };

    fetchMissingUserDetails();
  }, [withdrawals, userCache, loadingUsers]);

  useEffect(() => {
    // Fetch sales data for each withdrawal that we don't have in cache
    const fetchMissingSalesData = async () => {
      const userIdsToFetch = withdrawals
        .map((w) => w.user_id)
        .filter((id) => !salesCache[id] && !loadingSales[id]);

      if (userIdsToFetch.length === 0) return;

      // Mark these sales as loading
      setLoadingSales((prev) => {
        const newLoadingState = { ...prev };
        userIdsToFetch.forEach((id) => {
          newLoadingState[id] = true;
        });
        return newLoadingState;
      });

      // Fetch sales data in parallel
      const salesPromises = userIdsToFetch.map(async (userId) => {
        const response = await getSalesByUserId(userId);
        if (response.data) {
          return { userId, salesData: response.data };
        }
        return { userId, salesData: null };
      });

      const results = await Promise.all(salesPromises);

      // Update cache with results
      const newCacheEntries: Record<string, SalesData> = {};
      results.forEach((result) => {
        if (result.salesData) {
          newCacheEntries[result.userId] =
            result.salesData as unknown as SalesData;
        }
      });

      setSalesCache((prev) => ({ ...prev, ...newCacheEntries }));

      // Mark these sales as no longer loading
      setLoadingSales((prev) => {
        const newLoadingState = { ...prev };
        userIdsToFetch.forEach((id) => {
          delete newLoadingState[id];
        });
        return newLoadingState;
      });
    };

    fetchMissingSalesData();
  }, [withdrawals, salesCache, loadingSales]);

  async function fetchWithdrawals() {
    setIsLoading(true);
    try {
      let response;

      // Check if the user is logged in and has the admin role
      if (user && user.$id && user.labels && user.labels.includes("ADMIN")) {
        response = await getWithdrawalsByAdmin(
          user.$id,
          page,
          pageSize,
          keyword
        );
      } else {
        response = await adminGetAllWithdrawals(page, pageSize, keyword);
      }

      if (response && response.withdrawals) {
        setWithdrawals(response.withdrawals as unknown as Withdrawal[]);
        setTotalPages(Math.ceil(response.total / pageSize));
      } else if (response && response.error) {
        toast.error(response.error);
      } else {
        toast.error("Failed to fetch withdrawals");
      }
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast.error("Failed to fetch withdrawals");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove(id: string) {
    setProcessingId(id);
    try {
      // First update the withdrawal status
      const response = await adminUpdateWithdrawalStatus(id, 2);
      if (response.error) {
        toast.error(response.error);
        return;
      }

      // Find the withdrawal in our list
      const withdrawal = withdrawals.find((w) => w.$id === id);
      if (!withdrawal) {
        toast.error("Withdrawal record not found");
        return;
      }

      // Get the user's sales data
      const sales = salesCache[withdrawal.user_id];
      if (!sales) {
        toast.error("Sales record not found for this user");
        return;
      }

      // Get the withdrawal amount (prefer withdraw_amount if available)
      const withdrawalAmount =
        withdrawal.withdraw_amount || withdrawal.amount || 0;

      if (withdrawalAmount > 0) {
        // Make sure we don't go negative with the balance
        const newBalance = Math.max(0, sales.balance - withdrawalAmount);

        // Update ONLY the user's balance by deducting the withdrawal amount
        // No other fields should be affected
        const updateResponse = await updateSale(sales.$id, {
          balance: newBalance,
        });

        if (updateResponse.error) {
          toast.error(
            `Withdrawal approved but failed to update balance: ${updateResponse.error}`
          );
        } else {
          toast.success(
            `Withdrawal approved and balance updated: ৳${newBalance.toFixed(2)}`
          );

          // Update only the balance in the sales cache
          setSalesCache((prev) => ({
            ...prev,
            [withdrawal.user_id]: {
              ...sales,
              balance: newBalance,
            },
          }));
        }
      } else {
        toast.warning("Approved withdrawal with zero amount");
      }

      // Refresh the withdrawal list
      fetchWithdrawals();
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      toast.error("Failed to approve withdrawal");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: string) {
    setProcessingId(id);
    try {
      const response = await adminUpdateWithdrawalStatus(id, 3);
      if (response.error) {
        toast.error(response.error);
        return;
      }
      toast.success("Withdrawal rejected successfully");
      fetchWithdrawals();
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      toast.error("Failed to reject withdrawal");
    } finally {
      setProcessingId(null);
    }
  }

  function formatDate(dateString: string) {
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

  function getUserDisplay(userId: string) {
    if (loadingUsers[userId]) {
      return (
        <div className="flex items-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span>Loading...</span>
        </div>
      );
    }

    const user = userCache[userId];
    if (!user) {
      return (
        <div className="flex items-center text-gray-500">
          <UserRound className="h-4 w-4 mr-2" />
          <span>{userId.substring(0, 8)}...</span>
        </div>
      );
    }

    return (
      <div>
        <div className="font-medium">{user.name}</div>
        <div className="text-xs text-gray-500">{user.phone || user.email}</div>
      </div>
    );
  }

  function getWithdrawalAmount(withdrawal: Withdrawal, userId: string) {
    if (withdrawal.amount || withdrawal.withdraw_amount) {
      const amount = withdrawal.amount || withdrawal.withdraw_amount || 0;
      return `৳${amount.toFixed(2)}`;
    }

    if (loadingSales[userId]) {
      return "Loading...";
    }

    const sales = salesCache[userId];
    if (!sales) {
      return "N/A";
    }

    // Use balance as the withdrawal amount since we've updated the sales domain
    return `৳${sales.balance.toFixed(2)}`;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0); // Reset to first page when searching
    fetchWithdrawals();
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Withdrawal Requests
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
            placeholder="Search by user ID or name..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Button type="submit">Search</Button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading withdrawals...</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Withdrawal Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No withdrawal requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.$id}>
                      <TableCell>
                        {getUserDisplay(withdrawal.user_id)}
                      </TableCell>
                      <TableCell>
                        {formatDate(
                          withdrawal.requested_at || withdrawal.$createdAt
                        )}
                      </TableCell>
                      <TableCell>
                        {getWithdrawalAmount(withdrawal, withdrawal.user_id)}
                      </TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {withdrawal.status === 1 && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(withdrawal.$id)}
                                disabled={processingId === withdrawal.$id}
                                className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReject(withdrawal.$id)}
                                disabled={processingId === withdrawal.$id}
                                className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {withdrawal.status !== 1 && (
                            <span className="text-sm text-gray-500 italic">
                              Processed
                            </span>
                          )}
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
    </div>
  );
}
