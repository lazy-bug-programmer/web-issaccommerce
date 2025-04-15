/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createAdminClient, getLoggedInUser } from "@/lib/appwrite/server";
import { ShipmentAutomation } from "@/lib/domains/shipment-automations.domain";
import { Query } from "node-appwrite";

const DATABASE_ID = 'Core';
const SHIPMENT_AUTOMATIONS_COLLECTION_ID = 'ShipmentAutomation';

// CREATE
export async function createShipmentAutomation(shipmentAutomation: ShipmentAutomation) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const newShipmentAutomation = await databases.createDocument(
            DATABASE_ID,
            SHIPMENT_AUTOMATIONS_COLLECTION_ID,
            "unique()",
            {
                progress: shipmentAutomation.progress,
                name: shipmentAutomation.name,
            }
        );

        return { data: newShipmentAutomation };
    } catch (error: any) {
        console.error("Error creating shipment automation:", error);
        return { error: error.message || "Failed to create shipment automation" };
    }
}

// READ
export async function getShipmentAutomations(limit = 10) {
    try {
        const { databases } = await createClient();

        const shipmentAutomations = await databases.listDocuments(
            DATABASE_ID,
            SHIPMENT_AUTOMATIONS_COLLECTION_ID,
            [Query.limit(limit)]
        );

        return { data: shipmentAutomations.documents };
    } catch (error: any) {
        console.error("Error getting shipment automations:", error);
        return { error: error.message || "Failed to get shipment automations" };
    }
}

export async function getShipmentAutomationById(shipmentAutomationId: string) {
    try {
        const { databases } = await createClient();

        const shipmentAutomation = await databases.getDocument(
            DATABASE_ID,
            SHIPMENT_AUTOMATIONS_COLLECTION_ID,
            shipmentAutomationId
        );

        return { data: shipmentAutomation };
    } catch (error: any) {
        console.error("Error getting shipment automation:", error);
        return { error: error.message || "Failed to get shipment automation" };
    }
}

export async function getUserShipmentAutomations() {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const shipmentAutomations = await databases.listDocuments(
            DATABASE_ID,
            SHIPMENT_AUTOMATIONS_COLLECTION_ID,
        );

        return { data: shipmentAutomations.documents };
    } catch (error: any) {
        console.error("Error getting user shipment automations:", error);
        return { error: error.message || "Failed to get user shipment automations" };
    }
}

// UPDATE
export async function updateShipmentAutomation(shipmentAutomationId: string, updates: Partial<ShipmentAutomation>) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const updatedShipmentAutomation = await databases.updateDocument(
            DATABASE_ID,
            SHIPMENT_AUTOMATIONS_COLLECTION_ID,
            shipmentAutomationId,
            updates
        );

        return { data: updatedShipmentAutomation };
    } catch (error: any) {
        console.error("Error updating shipment automation:", error);
        return { error: error.message || "Failed to update shipment automation" };
    }
}

// DELETE
export async function deleteShipmentAutomation(shipmentAutomationId: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            SHIPMENT_AUTOMATIONS_COLLECTION_ID,
            shipmentAutomationId
        );

        return { message: "Shipment automation deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting shipment automation:", error);
        return { error: error.message || "Failed to delete shipment automation" };
    }
}

// Admin operations
export async function adminDeleteShipmentAutomation(shipmentAutomationId: string) {
    try {
        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            SHIPMENT_AUTOMATIONS_COLLECTION_ID,
            shipmentAutomationId
        );

        return { message: "Shipment automation deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting shipment automation:", error);
        return { error: error.message || "Failed to delete shipment automation" };
    }
}

// Additional shipment automation specific functions
export async function updateProgress(shipmentAutomationId: string, progress: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const updatedShipmentAutomation = await databases.updateDocument(
            DATABASE_ID,
            SHIPMENT_AUTOMATIONS_COLLECTION_ID,
            shipmentAutomationId,
            {
                progress: progress
            }
        );

        return { data: updatedShipmentAutomation };
    } catch (error: any) {
        console.error("Error updating progress:", error);
        return { error: error.message || "Failed to update progress" };
    }
}

// Helper function to create a regular client
async function createClient() {
    const { databases } = await createAdminClient();
    return { databases };
}