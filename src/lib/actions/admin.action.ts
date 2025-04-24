/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createAdminClient, getLoggedInUser } from "@/lib/appwrite/server";
import { Query } from "node-appwrite";
import { uuidv4 } from "@/lib/guid";

// Get a list of admin users
export async function getAdmins(limit = 10000, offset = 0) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized", total: 0 };
        }

        // Check if current user is superadmin
        if (user.labels && !user.labels.includes("SUPERADMIN")) {
            return { error: "Only superadmins can view admin accounts", total: 0 };
        }

        const client = await createAdminClient();

        const queries = [
            Query.contains("labels", "ADMIN"),
            Query.limit(limit),
            Query.offset(offset),
            Query.orderDesc("$createdAt")
        ];

        const response = await client.users.list(queries);

        return {
            data: response.users.map(user => ({
                $id: user.$id,
                name: user.name,
                phone: user.phone,
                role: "ADMIN",
                status: user.status,
                $createdAt: user.$createdAt
            })),
            total: response.total
        };
    } catch (error: any) {
        console.error("Error getting admins:", error);
        return { error: "Failed to get admin accounts", total: 0 };
    }
}

// Create a new admin user
export async function createAdmin(name: string, phone: string, password: string) {
    try {
        const currentUser = await getLoggedInUser();
        if (!currentUser) {
            return { error: "Not authorized" };
        }

        // Check if current user is superadmin
        if (currentUser.labels && !currentUser.labels.includes("SUPERADMIN")) {
            return { error: "Only superadmins can create admin accounts" };
        }

        const client = await createAdminClient();

        // Check if phone already exists
        const existingUsers = await client.users.list([
            Query.equal("phone", phone)
        ]);

        if (existingUsers.total > 0) {
            return { error: "Phone number is already in use" };
        }

        const userId = uuidv4();

        // Create user in Appwrite auth
        const newUser = await client.account.create(
            userId,
            `${userId}@web.com`,
            password,
            name
        );

        // Update the user labels
        await client.users.updatePhone(newUser.$id, "+6" + phone);
        await client.users.updateLabels(newUser.$id, ["ADMIN"]);

        return { data: newUser, user_id: newUser.$id };
    } catch (error: any) {
        console.error("Error creating admin:", error);
        return { error: error.message || "Failed to create admin account" };
    }
}

// Delete an admin user
export async function deleteAdmin(adminId: string) {
    try {
        const currentUser = await getLoggedInUser();
        if (!currentUser) {
            return { error: "Not authorized" };
        }

        // Check if current user is superadmin
        if (currentUser.labels && !currentUser.labels.includes("SUPERADMIN")) {
            return { error: "Only superadmins can delete admin accounts" };
        }

        // Prevent deleting yourself
        if (adminId === currentUser.$id) {
            return { error: "You cannot delete your own account" };
        }

        const client = await createAdminClient();

        // Check if the user is actually an admin
        const users = await client.users.list([
            Query.equal("$id", adminId),
            Query.contains("labels", "ADMIN")
        ]);

        if (users.total === 0) {
            return { error: "You can only delete admin accounts from this page" };
        }

        // Delete user
        await client.users.delete(adminId);

        return { message: "Admin deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting admin:", error);
        return { error: error.message || "Failed to delete admin account" };
    }
}

// Update an admin user
export async function updateAdmin(
    adminId: string,
    name: string,
    phone?: string,
    password?: string
) {
    try {
        const currentUser = await getLoggedInUser();
        if (!currentUser) {
            return { error: "Not authorized" };
        }

        // Check if current user is superadmin
        if (currentUser.labels && !currentUser.labels.includes("SUPERADMIN")) {
            return { error: "Only superadmins can update admin accounts" };
        }

        const client = await createAdminClient();

        // Get the user to check if they're actually an admin
        const users = await client.users.list([
            Query.equal("$id", adminId),
            Query.contains("labels", "ADMIN")
        ]);

        if (users.total === 0) {
            return { error: "Admin not found" };
        }

        // Update name
        await client.users.updateName(adminId, name);

        // Update phone if provided
        if (phone) {
            await client.users.updatePhone(adminId, phone);
        }

        // Update password if provided
        if (password) {
            await client.users.updatePassword(adminId, password);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error updating admin:", error);
        return { error: error.message || "Failed to update admin account" };
    }
}

// Get admin by ID
export async function getAdminById(adminId: string) {
    try {
        const client = await createAdminClient();

        const users = await client.users.list([
            Query.equal("$id", adminId),
            Query.contains("labels", "ADMIN")
        ]);

        if (users.total === 0) {
            return { error: "Admin not found" };
        }

        const admin = users.users[0];

        return {
            data: {
                $id: admin.$id,
                name: admin.name,
                email: admin.email,
                status: admin.status,
                labels: admin.labels
            }
        };
    } catch (error: any) {
        console.error("Error fetching admin:", error);
        return { error: error.message || "Failed to fetch admin" };
    }
}