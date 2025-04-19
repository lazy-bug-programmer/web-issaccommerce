"use client";

import { useEffect, useState } from "react";
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
  getReferralCodes,
} from "@/lib/actions/referral-code.action";

// Extended referral code with additional attributes
interface ExtendedReferralCode extends ReferralCode {
  user_id?: string | null; // Keep this for status display only
}

export default function AdminReferralCodePage() {
  const [referralCodes, setReferralCodes] = useState<ExtendedReferralCode[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

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

        // If no codes exist, auto-generate one
        if (extendedCodes.length === 0) {
          generateReferralCode();
        }
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

  async function generateReferralCode() {
    try {
      const response = await adminCreateReferralCode();

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success("Your referral code was automatically generated");
      fetchReferralCodes();
    } catch (error) {
      console.error("Error generating referral code:", error);
      toast.error("Failed to generate referral code");
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          My Referral Code
        </h2>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralCodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={1} className="text-center py-8">
                      Generating your referral code...
                    </TableCell>
                  </TableRow>
                ) : (
                  referralCodes.map((code) => (
                    <TableRow key={code.$id}>
                      <TableCell className="font-medium">{code.code}</TableCell>
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
