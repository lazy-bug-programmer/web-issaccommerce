/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createAdminClient, getLoggedInUser } from "@/lib/appwrite/server";
import { ReferralCode } from "@/lib/domains/referral-codes.domain";
import { Query } from "node-appwrite";

const DATABASE_ID = 'Core';
const REFERRAL_CODES_COLLECTION_ID = 'ReferralCode';

// Helper function to generate a random 6-digit code
function generateReferralCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// CREATE
export async function createReferralCode() {
    try {
        const { databases } = await createAdminClient();

        // Generate a unique 6-digit code
        let code = generateReferralCode();
        let isUnique = false;

        // Check if the code already exists
        while (!isUnique) {
            try {
                const existingCodes = await databases.listDocuments(
                    DATABASE_ID,
                    REFERRAL_CODES_COLLECTION_ID,
                    [Query.equal("code", code)]
                );

                if (existingCodes.total === 0) {
                    isUnique = true;
                } else {
                    code = generateReferralCode();
                }
            } catch (error) {
                console.error("Error checking code uniqueness:", error);
                throw error;
            }
        }

        const newReferralCode = await databases.createDocument(
            DATABASE_ID,
            REFERRAL_CODES_COLLECTION_ID,
            "unique()",
            {
                code: code,
            }
        );

        return { data: newReferralCode };
    } catch (error: any) {
        console.error("Error creating referral code:", error);
        return { error: error.message || "Failed to create referral code" };
    }
}

// READ
export async function getReferralCodes(limit = 10, offset = 0) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized", total: 0 };
        }

        const { databases } = await createClient();

        const referralCodes = await databases.listDocuments(
            DATABASE_ID,
            REFERRAL_CODES_COLLECTION_ID,
            [
                Query.equal("belongs_to", user.$id),
                Query.limit(limit),
                Query.offset(offset)
            ]
        );

        return {
            data: referralCodes.documents,
            total: referralCodes.total
        };
    } catch (error: any) {
        console.error("Error getting referral codes:", error);
        return { error: "Failed to get referral codes", total: 0 };
    }
}

export async function getReferralCodeByCode(code: string) {
    try {
        const { databases } = await createAdminClient();

        const referralCodes = await databases.listDocuments(
            DATABASE_ID,
            REFERRAL_CODES_COLLECTION_ID,
            [Query.equal("code", code)]
        );

        if (referralCodes.documents.length === 0) {
            return { error: "Referral code not found" };
        }

        return { data: referralCodes.documents[0] };
    } catch (error: any) {
        console.error("Error getting referral code:", error);
        return { error: "Failed to get referral code" };
    }
}

// Validate a referral code - check if it exists and is not already redeemed
export async function validateReferralCode(code: string) {
    try {
        const { databases } = await createAdminClient();

        const referralCodes = await databases.listDocuments(
            DATABASE_ID,
            REFERRAL_CODES_COLLECTION_ID,
            [Query.equal("code", code)]
        );

        if (referralCodes.documents.length === 0) {
            return { valid: false, error: "Referral code not found" };
        }

        const referralCode = referralCodes.documents[0];

        return { valid: true, data: referralCode };
    } catch (error: any) {
        console.error("Error validating referral code:", error);
        return { valid: false, error: error.message || "Failed to validate referral code" };
    }
}


// UPDATE
export async function updateReferralCode(referralCodeId: string, updates: Partial<ReferralCode>) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        // Only update fields that are part of the domain model
        const validUpdates: Partial<ReferralCode> = {};
        if (updates.code) validUpdates.code = updates.code;

        const updatedReferralCode = await databases.updateDocument(
            DATABASE_ID,
            REFERRAL_CODES_COLLECTION_ID,
            referralCodeId,
            validUpdates
        );

        return { data: updatedReferralCode };
    } catch (error: any) {
        console.error("Error updating referral code:", error);
        return { error: error.message || "Failed to update referral code" };
    }
}

// DELETE
export async function deleteReferralCode(referralCodeId: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            REFERRAL_CODES_COLLECTION_ID,
            referralCodeId
        );

        return { message: "Referral code deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting referral code:", error);
        return { error: error.message || "Failed to delete referral code" };
    }
}

// Admin functions
export async function adminCreateReferralCode() {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        // Generate a unique 6-digit code
        let code = generateReferralCode();
        let isUnique = false;

        // Check if the code already exists
        while (!isUnique) {
            try {
                const existingCodes = await databases.listDocuments(
                    DATABASE_ID,
                    REFERRAL_CODES_COLLECTION_ID,
                    [Query.equal("code", code)]
                );

                if (existingCodes.total === 0) {
                    isUnique = true;
                } else {
                    code = generateReferralCode();
                }
            } catch (error) {
                console.error("Error checking code uniqueness:", error);
                throw error;
            }
        }

        const newReferralCode = await databases.createDocument(
            DATABASE_ID,
            REFERRAL_CODES_COLLECTION_ID,
            "unique()",
            {
                code: code,
                belongs_to: user.$id,
            }
        );

        return { data: newReferralCode };
    } catch (error: any) {
        console.error("Error creating referral code:", error);
        return { error: error.message || "Failed to create referral code" };
    }
}

export async function adminUpdateReferralCode(referralCodeId: string, updates: Partial<ReferralCode>) {
    try {
        const { databases } = await createAdminClient();

        // Only update fields that are part of the domain model
        const validUpdates: Partial<ReferralCode> = {};
        if (updates.code) validUpdates.code = updates.code;

        const updatedReferralCode = await databases.updateDocument(
            DATABASE_ID,
            REFERRAL_CODES_COLLECTION_ID,
            referralCodeId,
            validUpdates
        );

        return { data: updatedReferralCode };
    } catch (error: any) {
        console.error("Error updating referral code:", error);
        return { error: error.message || "Failed to update referral code" };
    }
}

export async function adminDeleteReferralCode(referralCodeId: string) {
    try {
        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            REFERRAL_CODES_COLLECTION_ID,
            referralCodeId
        );

        return { message: "Referral code deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting referral code:", error);
        return { error: error.message || "Failed to delete referral code" };
    }
}

// Helper function to create a regular client
async function createClient() {
    const { databases } = await createAdminClient();
    return { databases };
}