/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { createAdminClient, getLoggedInUser } from "@/lib/appwrite/server";
import { Query } from "node-appwrite";

const DATABASE_ID = 'Core';
const TASK_SETTINGS_COLLECTION_ID = 'TaskSettings';

// Type definition for a task item
export interface TaskItem {
    product_id: string;
    amount: string;
    user_id?: string[] | string; // Added user_id property that can be a string array, string, or undefined
}

// Type definition for the task settings
export interface TaskSettings {
    $id?: string;
    settings: string;
    name?: string;
    default_task_settings_id?: string;
}

// Helper function to create a regular client
async function createClient() {
    const { databases } = await createAdminClient();
    return { databases };
}

// CREATE
export async function createTaskSettings(taskSettings: TaskSettings) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        // Create a new object without $id property
        const { $id, ...taskSettingsWithoutId } = taskSettings;

        const newTaskSettings = await databases.createDocument(
            DATABASE_ID,
            TASK_SETTINGS_COLLECTION_ID,
            $id || "unique()",
            taskSettingsWithoutId
        );

        return { data: newTaskSettings };
    } catch (error: any) {
        console.error("Error creating task settings:", error);
        return { error: error.message || "Failed to create task settings" };
    }
}

// READ
export async function getTaskSettingsById(taskSettingsId: string) {
    try {
        const { databases } = await createClient();

        const taskSettings = await databases.getDocument(
            DATABASE_ID,
            TASK_SETTINGS_COLLECTION_ID,
            taskSettingsId
        );

        return { data: taskSettings };
    } catch (error: any) {
        console.error("Error getting task settings:", error);
        return { error: error.message || "Failed to get task settings" };
    }
}

// Get task settings by admin ID - to find admin-specific settings
export async function getTaskSettingsByAdminId(adminId: string) {
    try {
        const { databases } = await createClient();

        // Query for task settings where user_id equals the admin ID
        const adminTaskSettings = await databases.listDocuments(
            DATABASE_ID,
            TASK_SETTINGS_COLLECTION_ID,
            [Query.equal("user_id", adminId)]
        );

        if (adminTaskSettings.total > 0) {
            return { data: adminTaskSettings.documents[0] };
        } else {
            return { error: "No task settings found for this admin" };
        }
    } catch (error: any) {
        console.error("Error fetching admin task settings:", error);
        return { error: error.message || "Failed to fetch admin task settings" };
    }
}

// UPDATE
export async function updateTaskSettings(taskSettingsId: string, updates: Partial<TaskSettings>) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const updatedTaskSettings = await databases.updateDocument(
            DATABASE_ID,
            TASK_SETTINGS_COLLECTION_ID,
            taskSettingsId,
            updates
        );

        return { data: updatedTaskSettings };
    } catch (error: any) {
        console.error("Error updating task settings:", error);
        return { error: error.message || "Failed to update task settings" };
    }
}

// UPDATE specific task
export async function updateSpecificTask(taskSettingsId: string, taskKey: string, taskData: TaskItem) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        // First check if the task settings belongs to the user
        const taskSettings = await databases.getDocument(
            DATABASE_ID,
            TASK_SETTINGS_COLLECTION_ID,
            taskSettingsId
        );

        // Parse existing settings
        const settingsObj = JSON.parse(taskSettings.settings || '{}');

        // Update the specific task
        settingsObj[taskKey] = taskData;

        // Convert back to string
        const updatedSettings = JSON.stringify(settingsObj);

        const updatedTaskSettings = await databases.updateDocument(
            DATABASE_ID,
            TASK_SETTINGS_COLLECTION_ID,
            taskSettingsId,
            { settings: updatedSettings }
        );

        return { data: updatedTaskSettings };
    } catch (error: any) {
        console.error("Error updating specific task:", error);
        return { error: error.message || "Failed to update specific task" };
    }
}

// DELETE
export async function deleteTaskSettings(taskSettingsId: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            TASK_SETTINGS_COLLECTION_ID,
            taskSettingsId
        );

        return { message: "Task settings deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting task settings:", error);
        return { error: error.message || "Failed to delete task settings" };
    }
}

// Admin operations
export async function adminDeleteTaskSettings(taskSettingsId: string) {
    try {
        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            TASK_SETTINGS_COLLECTION_ID,
            taskSettingsId
        );

        return { message: "Task settings deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting task settings:", error);
        return { error: error.message || "Failed to delete task settings" };
    }
}

// Helper method to get default empty task settings
export async function getEmptyTaskSettings(): Promise<string> {
    const emptyTasks: Record<string, TaskItem> = {};

    for (let i = 1; i <= 36; i++) {
        emptyTasks[`task${i}`] = { product_id: "", amount: "" };
    }

    return JSON.stringify(emptyTasks);
}

// Get admin task settings (default task settings)
export async function getAdminTaskSettings() {
    try {
        const { databases } = await createClient();

        // We use a fixed ID "task-settings" for the default admin task settings
        try {
            const taskSettings = await databases.getDocument(
                DATABASE_ID,
                TASK_SETTINGS_COLLECTION_ID,
                "task-settings"
            );
            return { data: taskSettings };
        } catch (error) {
            console.error("Admin task settings not found:", error);

            // Return empty settings if no admin settings exist
            return {
                data: {
                    $id: "task-settings",
                    settings: await getEmptyTaskSettings()
                }
            };
        }
    } catch (error: any) {
        console.error("Error getting admin task settings:", error);
        return { error: error.message || "Failed to get admin task settings" };
    }
}

// Get user-specific task settings
export async function getUserTaskSettings() {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createClient();

        // First, check if user has custom task settings
        try {
            const userTaskSettings = await databases.listDocuments(
                DATABASE_ID,
                TASK_SETTINGS_COLLECTION_ID,
                [Query.equal("user_id", user.$id)]
            );

            if (userTaskSettings.total > 0) {
                return { data: userTaskSettings.documents[0] };
            }
        } catch (error) {
            console.error("Error checking for user task settings:", error);
        }

        // If the user doesn't have their own task settings, create one with empty settings
        try {
            const emptySettings = await getEmptyTaskSettings();

            const newTaskSettings = await databases.createDocument(
                DATABASE_ID,
                TASK_SETTINGS_COLLECTION_ID,
                "unique()",
                {
                    settings: emptySettings,
                    user_id: user.$id
                }
            );

            return { data: newTaskSettings };
        } catch (createError) {
            console.error("Error creating user task settings:", createError);
            return { error: "Failed to create task settings for user" };
        }
    } catch (error: any) {
        console.error("Error getting user task settings:", error);
        return { error: error.message || "Failed to get user task settings" };
    }
}

// Get all superadmin task settings (those with no user_id)
export async function getAllSuperadminTaskSettings() {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createClient();

        // Get all task settings with no user_id (superadmin settings)
        // We'll use "isNull" for empty user_id and also include the default task-settings
        const superadminSettings = await databases.listDocuments(
            DATABASE_ID,
            TASK_SETTINGS_COLLECTION_ID,
            [Query.or([
                Query.isNull("user_id"),
                Query.equal("$id", "task-settings")
            ])]
        );

        return {
            data: superadminSettings.documents,
            total: superadminSettings.total
        };
    } catch (error: any) {
        console.error("Error getting superadmin task settings:", error);
        return { error: error.message || "Failed to get superadmin task settings", total: 0 };
    }
}

// Create additional superadmin task settings
export async function createAdditionalSuperadminTaskSettings(name: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        // Get empty settings
        const emptySettings = await getEmptyTaskSettings();

        // Create new task settings with empty user_id
        const newTaskSettings = await databases.createDocument(
            DATABASE_ID,
            TASK_SETTINGS_COLLECTION_ID,
            "unique()", // Use unique ID
            {
                settings: emptySettings,
                name: name // Store the name for identification
            }
        );

        return { data: newTaskSettings };
    } catch (error: any) {
        console.error("Error creating additional superadmin task settings:", error);
        return { error: error.message || "Failed to create additional superadmin task settings" };
    }
}

// Get all sellers for task assignment (admin only function)
export async function getAllSellersForTaskAssignment() {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { users } = await createAdminClient();

        // Get all users with CUSTOMER label
        const sellers = await users.list([
            Query.contains("labels", "CUSTOMER"),
            Query.limit(100)
        ]);

        return {
            data: sellers.users.map(user => ({
                $id: user.$id,
                name: user.name,
                email: user.email
            }))
        };
    } catch (error: any) {
        console.error("Error getting sellers for task assignment:", error);
        return { error: error.message || "Failed to get sellers" };
    }
}