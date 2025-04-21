"use server"

/* eslint-disable @typescript-eslint/no-explicit-any */
import { uuidv4 } from "@/lib/guid";
import { Query } from "node-appwrite";
import { createAdminClient } from "../appwrite/server";

export async function createSeller(
    name: string,
    email: string,
    password: string,
    confirmPassword: string
) {
    if (password !== confirmPassword) {
        return { error: "Passwords do not match" };
    }

    try {
        const client = await createAdminClient();
        const user = await client.account.create(uuidv4(), email, password, name);

        // Update the user labels
        await client.users.updateLabels(user.$id, ["CUSTOMER"]);

        return { message: "Account created successfully" };
    } catch (err: any) {
        if (err) {
            switch (err.type) {
                case "user_already_exists":
                    return { error: "User already exists" };
            }
        }
        return { error: "Create account failed" };
    }
}

export async function getAllSeller(
    pageNumber: number,
    pageSize: number,
    keyword: string = ""
) {
    try {
        const client = await createAdminClient();

        const queries = [
            Query.contains("labels", "CUSTOMER"),
            Query.limit(pageSize),
            Query.offset(pageNumber * pageSize),
        ];

        if (keyword.trim()) {
            queries.push(Query.contains("name", keyword));
        }

        const response = await client.users.list(queries);

        return {
            users: response.users.map(user => ({
                $id: user.$id,
                name: user.name,
                email: user.email,
                status: user.status,
                phone: user.phone,
                labels: user.labels,
                $createdAt: user.$createdAt,
            })),
            total: response.total
        };
    } catch (error: any) {
        console.error("Error fetching sellers:", error);
        return { error: "Failed to fetch sellers" };
    }
}

export async function getSellerById(user_id: string) {
    try {
        const client = await createAdminClient();

        const queries = [
            Query.contains("labels", "CUSTOMER"),
            Query.equal("$id", user_id),
        ];

        const response = await client.users.list(queries);

        if (response.users.length === 0) {
            return { error: "Seller not found" };
        }

        const seller = response.users[0];

        // Return a plain serializable object
        return {
            seller: {
                $id: seller.$id,
                name: seller.name,
                email: seller.email,
                status: seller.status,
                prefs: seller.prefs,
                labels: seller.labels,
                $createdAt: seller.$createdAt,
            }
        };
    } catch (error: any) {
        console.error("Error fetching seller:", error);
        return { error: "Failed to fetch seller" };
    }
}

export async function updateSeller(
    sellerId: string,
    name: string,
    phone?: string,
    password?: string
) {
    try {
        const client = await createAdminClient();

        // Update name
        await client.users.updateName(sellerId, name);

        // Update phone if provided
        if (phone !== undefined) {
            // Ensure phone has proper format if needed
            const formattedPhone = phone.startsWith('+') ? phone : '+' + phone;
            await client.users.updatePhone(sellerId, formattedPhone);
        }

        // Update password if provided
        if (password !== undefined) {
            await client.users.updatePassword(sellerId, password);
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating seller:", error);
        return { error: "Failed to update seller" };
    }
}

export async function deleteSeller(sellerId: string) {
    try {
        const client = await createAdminClient();
        await client.users.delete(sellerId);
        return { message: "Seller deleted successfully" };
    } catch (err: any) {
        console.error("Error deleting seller:", err);
        return { error: "Failed to delete seller" };
    }
}

export async function getSellersByReferralCode(referralCode: string) {
    try {
        const client = await createAdminClient();

        // First get all users with CUSTOMER label
        const queries = [
            Query.contains("labels", "CUSTOMER"),
            Query.limit(100),
        ];

        const response = await client.users.list(queries);

        // Filter users who have the referral code in their preferences
        const sellers = response.users.filter(user => {
            const prefs = user.prefs || {};
            return prefs.referralCode === referralCode;
        });

        return {
            sellers: sellers.map(user => ({
                $id: user.$id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                status: user.status,
                $createdAt: user.$createdAt,
            })),
            total: sellers.length
        };
    } catch (error: any) {
        console.error("Error fetching sellers by referral code:", error);
        return { error: "Failed to fetch sellers", sellers: [] };
    }
}