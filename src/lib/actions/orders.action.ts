/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createAdminClient, getLoggedInUser } from "@/lib/appwrite/server";
import { Query } from "node-appwrite";
import { Orders } from "../domains/orders.domain";

const DATABASE_ID = 'Core';
const ORDERS_COLLECTION_ID = 'Orders';

// CREATE 
export async function createOrder(order: Omit<Orders, "$id" | "user_id" | "ordered_at">) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const now = new Date().toISOString();

        const newOrder = await databases.createDocument(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            "unique()",
            {
                user_id: user.$id,
                product_id: order.product_id,
                amount: order.amount,
                shipment_automation_id: order.shipment_automation_id || null,
                ordered_at: now
            }
        );

        return { data: newOrder };
    } catch (error: any) {
        console.error("Error creating order:", error);
        return { error: error.message || "Failed to create order" };
    }
}

// READ
export async function getOrders(limit = 10) {
    try {
        const { databases } = await createClient();

        const orders = await databases.listDocuments(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            [Query.limit(limit), Query.orderDesc("ordered_at")]
        );

        return { data: orders.documents, total: orders.total };
    } catch (error: any) {
        console.error("Error getting orders:", error);
        return { error: error.message || "Failed to get orders" };
    }
}

export async function getOrderById(orderId: string) {
    try {
        const { databases } = await createClient();

        const order = await databases.getDocument(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            orderId
        );

        return { data: order };
    } catch (error: any) {
        console.error("Error getting order:", error);
        return { error: error.message || "Failed to get order" };
    }
}

export async function getUserOrders() {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const orders = await databases.listDocuments(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            [
                Query.equal("user_id", user.$id),
                Query.orderDesc("ordered_at")
            ]
        );

        return { data: orders.documents };
    } catch (error: any) {
        console.error("Error getting user orders:", error);
        return { error: error.message || "Failed to get user orders" };
    }
}

// UPDATE
export async function updateOrder(orderId: string, updates: Partial<Orders>) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        // First check if the order belongs to the user
        const order = await databases.getDocument(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            orderId
        );

        if (order.user_id !== user.$id) {
            return { error: "Not authorized to update this order" };
        }

        const updatedOrder = await databases.updateDocument(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            orderId,
            updates
        );

        return { data: updatedOrder };
    } catch (error: any) {
        console.error("Error updating order:", error);
        return { error: error.message || "Failed to update order" };
    }
}

// Add shipment to order
export async function addShipmentToOrder(orderId: string, shipmentId: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const updatedOrder = await databases.updateDocument(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            orderId,
            {
                shipment_automation_id: shipmentId
            }
        );

        return { data: updatedOrder };
    } catch (error: any) {
        console.error("Error adding shipment to order:", error);
        return { error: error.message || "Failed to update order with shipment" };
    }
}

// Update order status
export async function updateOrderStatus(orderId: string, status: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const updatedOrder = await databases.updateDocument(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            orderId,
            {
                status: status
            }
        );

        return { data: updatedOrder };
    } catch (error: any) {
        console.error("Error updating order status:", error);
        return { error: error.message || "Failed to update order status" };
    }
}

// DELETE
export async function deleteOrder(orderId: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        // First check if the order belongs to the user
        const order = await databases.getDocument(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            orderId
        );

        if (order.user_id !== user.$id) {
            return { error: "Not authorized to delete this order" };
        }

        await databases.deleteDocument(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            orderId
        );

        return { message: "Order deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting order:", error);
        return { error: error.message || "Failed to delete order" };
    }
}

// Admin operations
export async function adminGetAllOrders(limit = 100) {
    try {
        const { databases } = await createAdminClient();

        const orders = await databases.listDocuments(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            [Query.limit(limit), Query.orderDesc("ordered_at")]
        );

        return { data: orders.documents, total: orders.total };
    } catch (error: any) {
        console.error("Error getting all orders:", error);
        return { error: error.message || "Failed to get all orders" };
    }
}

export async function adminDeleteOrder(orderId: string) {
    try {
        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            orderId
        );

        return { message: "Order deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting order:", error);
        return { error: error.message || "Failed to delete order" };
    }
}

// Helper function to create a regular client
async function createClient() {
    const { databases } = await createAdminClient();
    return { databases };
}
