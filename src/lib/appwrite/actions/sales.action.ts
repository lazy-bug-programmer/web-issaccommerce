/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createAdminClient, getLoggedInUser } from "@/lib/appwrite/server";
import { Sale } from "@/lib/domains/sales.domain";
import { Query } from "node-appwrite";

const DATABASE_ID = 'Core';
const SALES_COLLECTION_ID = 'Sales';

// CREATE
export async function createSale(sale: Sale) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const newSale = await databases.createDocument(
            DATABASE_ID,
            SALES_COLLECTION_ID,
            "unique()",
            {
                user_id: sale.user_id,
                task_complete: sale.task_complete,
                total_sales: sale.total_sales,
            }
        );

        return { data: newSale };
    } catch (error: any) {
        console.error("Error creating sale:", error);
        return { error: error.message || "Failed to create sale" };
    }
}

// READ
export async function getSales(limit = 10) {
    try {
        const { databases } = await createClient();

        const sales = await databases.listDocuments(
            DATABASE_ID,
            SALES_COLLECTION_ID,
            [Query.limit(limit)]
        );

        return { data: sales.documents };
    } catch (error: any) {
        console.error("Error getting sales:", error);
        return { error: error.message || "Failed to get sales" };
    }
}

export async function getSaleById(saleId: string) {
    try {
        const { databases } = await createClient();

        const sale = await databases.getDocument(
            DATABASE_ID,
            SALES_COLLECTION_ID,
            saleId
        );

        return { data: sale };
    } catch (error: any) {
        console.error("Error getting sale:", error);
        return { error: error.message || "Failed to get sale" };
    }
}

export async function getUserSales() {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const sales = await databases.listDocuments(
            DATABASE_ID,
            SALES_COLLECTION_ID,
            [Query.equal("user_id", user.$id)]
        );

        return { data: sales.documents };
    } catch (error: any) {
        console.error("Error getting user sales:", error);
        return { error: error.message || "Failed to get user sales" };
    }
}

// Get sales by user ID (for admin)
export async function getSalesByUserId(userId: string) {
    try {
        const { databases } = await createAdminClient();

        const sales = await databases.listDocuments(
            DATABASE_ID,
            SALES_COLLECTION_ID,
            [Query.equal("user_id", userId)]
        );

        if (sales.documents.length === 0) {
            return { data: null };
        }

        return { data: sales.documents[0] };
    } catch (error: any) {
        console.error("Error getting sales by user ID:", error);
        return { error: error.message || "Failed to get sales data" };
    }
}

// UPDATE
export async function updateSale(saleId: string, updates: Partial<Sale>) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const updatedSale = await databases.updateDocument(
            DATABASE_ID,
            SALES_COLLECTION_ID,
            saleId,
            updates
        );

        return { data: updatedSale };
    } catch (error: any) {
        console.error("Error updating sale:", error);
        return { error: error.message || "Failed to update sale" };
    }
}

// DELETE
export async function deleteSale(saleId: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            SALES_COLLECTION_ID,
            saleId
        );

        return { message: "Sale deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting sale:", error);
        return { error: error.message || "Failed to delete sale" };
    }
}

// Admin operations
export async function adminDeleteSale(saleId: string) {
    try {
        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            SALES_COLLECTION_ID,
            saleId
        );

        return { message: "Sale deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting sale:", error);
        return { error: error.message || "Failed to delete sale" };
    }
}

// Additional sales-specific functions
export async function updateTotalSales(saleId: string, amount: number) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        // First check if the sale belongs to the user
        const sale = await databases.getDocument(
            DATABASE_ID,
            SALES_COLLECTION_ID,
            saleId
        );

        const updatedSale = await databases.updateDocument(
            DATABASE_ID,
            SALES_COLLECTION_ID,
            saleId,
            {
                total_sales: sale.total_sales + amount
            }
        );

        return { data: updatedSale };
    } catch (error: any) {
        console.error("Error updating total sales:", error);
        return { error: error.message || "Failed to update total sales" };
    }
}

export async function incrementTaskComplete(saleId: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        // First check if the sale belongs to the user
        const sale = await databases.getDocument(
            DATABASE_ID,
            SALES_COLLECTION_ID,
            saleId
        );

        const updatedSale = await databases.updateDocument(
            DATABASE_ID,
            SALES_COLLECTION_ID,
            saleId,
            {
                task_complete: sale.task_complete + 1
            }
        );

        return { data: updatedSale };
    } catch (error: any) {
        console.error("Error incrementing task complete:", error);
        return { error: error.message || "Failed to increment task complete" };
    }
}

// Helper function to create a regular client
async function createClient() {
    const { databases } = await createAdminClient();
    return { databases };
}