/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createAdminClient, getLoggedInUser } from "@/lib/appwrite/server";
import { SocialSettings } from "@/lib/domains/social-settings.domain";

const DATABASE_ID = 'Core';
const SOCIAL_SETTINGS_COLLECTION_ID = 'SocialSettings';
const DEFAULT_ID = 'default';

// Get or create default social settings
export async function getOrCreateDefaultSocialSettings() {
    try {
        const { databases } = await createAdminClient();

        try {
            // Try to get the default settings first
            const socialSettings = await databases.getDocument(
                DATABASE_ID,
                SOCIAL_SETTINGS_COLLECTION_ID,
                DEFAULT_ID
            );

            return { data: socialSettings };
        } catch {
            // If not found, create default settings
            const defaultSettings = await databases.createDocument(
                DATABASE_ID,
                SOCIAL_SETTINGS_COLLECTION_ID,
                DEFAULT_ID,
                {
                    whatsapp_link: '',
                    telegram_link: ''
                }
            );

            return { data: defaultSettings };
        }
    } catch (error: any) {
        console.error("Error getting/creating default social settings:", error);
        return { error: error.message || "Failed to get/create social settings" };
    }
}

// Update default social settings
export async function updateDefaultSocialSettings(updates: Partial<SocialSettings>) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        // First ensure default settings exist
        await getOrCreateDefaultSocialSettings();

        // Then update them
        const updatedSocialSettings = await databases.updateDocument(
            DATABASE_ID,
            SOCIAL_SETTINGS_COLLECTION_ID,
            DEFAULT_ID,
            updates
        );

        return { data: updatedSocialSettings };
    } catch (error: any) {
        console.error("Error updating social settings:", error);
        return { error: error.message || "Failed to update social settings" };
    }
}

// For completeness, implementing other CRUD methods that might be useful
export async function getSocialSettings() {
    try {
        return await getOrCreateDefaultSocialSettings();
    } catch (error: any) {
        console.error("Error getting social settings:", error);
        return { error: error.message || "Failed to get social settings" };
    }
}
