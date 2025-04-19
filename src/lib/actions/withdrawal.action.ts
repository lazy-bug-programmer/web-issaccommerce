/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createAdminClient, getLoggedInUser } from "@/lib/appwrite/server";
import { Withdrawal } from "@/lib/domains/withdrawal.domain";
import { Query } from "node-appwrite";

const DATABASE_ID = 'Core';
const WITHDRAWALS_COLLECTION_ID = 'Withdrawal';

// CREATE
export async function createWithdrawal(amount: number = 0) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        if (amount <= 0) {
            return { error: "Withdrawal amount must be greater than zero" };
        }

        const { databases } = await createAdminClient();

        // Create withdrawal object without $id
        const withdrawalData = {
            user_id: user.$id,
            withdraw_amount: amount,
            requested_at: new Date(),
            status: 1 // Assuming 1 is the status for pending
        };

        const newWithdrawal = await databases.createDocument(
            DATABASE_ID,
            WITHDRAWALS_COLLECTION_ID,
            "unique()",
            withdrawalData
        );

        return { data: newWithdrawal };
    } catch (error: any) {
        console.error("Error creating withdrawal:", error);
        return { error: error.message || "Failed to create withdrawal" };
    }
}

// READ
export async function getWithdrawals(limit = 10, offset = 0) {
    try {
        const { databases } = await createClient();

        const withdrawals = await databases.listDocuments(
            DATABASE_ID,
            WITHDRAWALS_COLLECTION_ID,
            [
                Query.limit(limit),
                Query.offset(offset)
            ]
        );

        return {
            data: withdrawals.documents,
            total: withdrawals.total
        };
    } catch (error: any) {
        console.error("Error getting withdrawals:", error);
        return { error: error.message || "Failed to get withdrawals", total: 0 };
    }
}

export async function getWithdrawalById(withdrawalId: string) {
    try {
        const { databases } = await createClient();

        const withdrawal = await databases.getDocument(
            DATABASE_ID,
            WITHDRAWALS_COLLECTION_ID,
            withdrawalId
        );

        return { data: withdrawal };
    } catch (error: any) {
        console.error("Error getting withdrawal:", error);
        return { error: error.message || "Failed to get withdrawal" };
    }
}

export async function getUserWithdrawals() {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const withdrawals = await databases.listDocuments(
            DATABASE_ID,
            WITHDRAWALS_COLLECTION_ID,
            [Query.equal("user_id", user.$id)]
        );

        return { data: withdrawals.documents };
    } catch (error: any) {
        console.error("Error getting user withdrawals:", error);
        return { error: error.message || "Failed to get user withdrawals" };
    }
}

// UPDATE
export async function updateWithdrawal(withdrawalId: string, updates: Partial<Withdrawal>) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        // First check if the withdrawal belongs to the user
        const withdrawal = await databases.getDocument(
            DATABASE_ID,
            WITHDRAWALS_COLLECTION_ID,
            withdrawalId
        );

        if (withdrawal.user_id !== user.$id) {
            return { error: "Not authorized to update this withdrawal" };
        }

        const updatedWithdrawal = await databases.updateDocument(
            DATABASE_ID,
            WITHDRAWALS_COLLECTION_ID,
            withdrawalId,
            updates
        );

        return { data: updatedWithdrawal };
    } catch (error: any) {
        console.error("Error updating withdrawal:", error);
        return { error: error.message || "Failed to update withdrawal" };
    }
}

// DELETE
export async function deleteWithdrawal(withdrawalId: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        // First check if the withdrawal belongs to the user
        const withdrawal = await databases.getDocument(
            DATABASE_ID,
            WITHDRAWALS_COLLECTION_ID,
            withdrawalId
        );

        if (withdrawal.user_id !== user.$id) {
            return { error: "Not authorized to delete this withdrawal" };
        }

        await databases.deleteDocument(
            DATABASE_ID,
            WITHDRAWALS_COLLECTION_ID,
            withdrawalId
        );

        return { message: "Withdrawal deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting withdrawal:", error);
        return { error: error.message || "Failed to delete withdrawal" };
    }
}

// Admin operations
export async function adminGetAllWithdrawals(page = 0, limit = 10, keyword = "") {
    try {
        const { databases } = await createAdminClient();

        const queries = [
            Query.limit(limit),
            Query.offset(page * limit),
            Query.orderDesc("requested_at")
        ];

        if (keyword) {
            queries.push(Query.search("user_id", keyword));
        }

        const withdrawals = await databases.listDocuments(
            DATABASE_ID,
            WITHDRAWALS_COLLECTION_ID,
            queries
        );

        return {
            withdrawals: withdrawals.documents,
            total: withdrawals.total
        };
    } catch (error: any) {
        console.error("Error getting all withdrawals:", error);
        return { error: error.message || "Failed to get withdrawals", total: 0 };
    }
}

export async function adminUpdateWithdrawalStatus(withdrawalId: string, status: number) {
    try {
        const { databases } = await createAdminClient();

        const updatedWithdrawal = await databases.updateDocument(
            DATABASE_ID,
            WITHDRAWALS_COLLECTION_ID,
            withdrawalId,
            { status }
        );

        return { data: updatedWithdrawal };
    } catch (error: any) {
        console.error("Error updating withdrawal status:", error);
        return { error: error.message || "Failed to update withdrawal status" };
    }
}

export async function adminDeleteWithdrawal(withdrawalId: string) {
    try {
        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            WITHDRAWALS_COLLECTION_ID,
            withdrawalId
        );

        return { message: "Withdrawal deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting withdrawal:", error);
        return { error: error.message || "Failed to delete withdrawal" };
    }
}

// Helper function to create a regular client
async function createClient() {
    const { databases } = await createAdminClient();
    return { databases };
}
