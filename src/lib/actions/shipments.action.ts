/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createAdminClient, getLoggedInUser } from "@/lib/appwrite/server";
import { Shipment } from "@/lib/domains/shipments.domain";
import { Query } from "node-appwrite";

const DATABASE_ID = 'Core';
const SHIPMENTS_COLLECTION_ID = 'Shipment';

// CREATE
export async function createShipment(shipment: Shipment) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const newShipment = await databases.createDocument(
            DATABASE_ID,
            SHIPMENTS_COLLECTION_ID,
            "unique()",
            {
                user_id: shipment.user_id,
                shipment_automation_id: shipment.shipment_automation_id,
                customer_name: shipment.customer_name,
                product_id: shipment.product_id,
                order_date: shipment.order_date,
            }
        );

        return { data: newShipment };
    } catch (error: any) {
        console.error("Error creating shipment:", error);
        return { error: error.message || "Failed to create shipment" };
    }
}

// READ
export async function getShipments(limit = 10000) {
    try {
        const { databases } = await createClient();

        const shipments = await databases.listDocuments(
            DATABASE_ID,
            SHIPMENTS_COLLECTION_ID,
            [Query.limit(limit)]
        );

        return { data: shipments.documents };
    } catch (error: any) {
        console.error("Error getting shipments:", error);
        return { error: error.message || "Failed to get shipments" };
    }
}

export async function getShipmentById(shipmentId: string) {
    try {
        const { databases } = await createClient();

        const shipment = await databases.getDocument(
            DATABASE_ID,
            SHIPMENTS_COLLECTION_ID,
            shipmentId
        );

        return { data: shipment };
    } catch (error: any) {
        console.error("Error getting shipment:", error);
        return { error: error.message || "Failed to get shipment" };
    }
}

export async function getUserShipments() {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const shipments = await databases.listDocuments(
            DATABASE_ID,
            SHIPMENTS_COLLECTION_ID,
            [Query.equal("user_id", user.$id)]
        );

        return { data: shipments.documents };
    } catch (error: any) {
        console.error("Error getting user shipments:", error);
        return { error: error.message || "Failed to get user shipments" };
    }
}

// UPDATE
export async function updateShipment(shipmentId: string, updates: Partial<Shipment>) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const updatedShipment = await databases.updateDocument(
            DATABASE_ID,
            SHIPMENTS_COLLECTION_ID,
            shipmentId,
            updates
        );

        return { data: updatedShipment };
    } catch (error: any) {
        console.error("Error updating shipment:", error);
        return { error: error.message || "Failed to update shipment" };
    }
}

// DELETE
export async function deleteShipment(shipmentId: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            SHIPMENTS_COLLECTION_ID,
            shipmentId
        );

        return { message: "Shipment deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting shipment:", error);
        return { error: error.message || "Failed to delete shipment" };
    }
}

// Admin operations
export async function adminDeleteShipment(shipmentId: string) {
    try {
        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            SHIPMENTS_COLLECTION_ID,
            shipmentId
        );

        return { message: "Shipment deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting shipment:", error);
        return { error: error.message || "Failed to delete shipment" };
    }
}

// Additional shipment-specific functions
export async function getShipmentsByProductId(productId: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const shipments = await databases.listDocuments(
            DATABASE_ID,
            SHIPMENTS_COLLECTION_ID,
            [
                Query.equal("user_id", user.$id),
                Query.equal("product_id", productId)
            ]
        );

        return { data: shipments.documents };
    } catch (error: any) {
        console.error("Error getting shipments by product ID:", error);
        return { error: error.message || "Failed to get shipments by product ID" };
    }
}

export async function getRecentShipments(days = 30) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        // Calculate date from 'days' ago
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);

        const shipments = await databases.listDocuments(
            DATABASE_ID,
            SHIPMENTS_COLLECTION_ID,
            [
                Query.equal("user_id", user.$id),
                Query.greaterThan("order_date", dateFrom.toISOString())
            ]
        );

        return { data: shipments.documents };
    } catch (error: any) {
        console.error("Error getting recent shipments:", error);
        return { error: error.message || "Failed to get recent shipments" };
    }
}

// Helper function to create a regular client
async function createClient() {
    const { databases } = await createAdminClient();
    return { databases };
}