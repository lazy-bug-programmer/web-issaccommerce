/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { createAdminClient, getLoggedInUser } from "@/lib/appwrite/server";

const DATABASE_ID = 'Core';
const TASK_SETTINGS_COLLECTION_ID = 'TaskSettings';

// Type definition for a task item
export interface TaskItem {
    product_id: string;
    amount: string;
}

// Type definition for the task settings
export interface TaskSettings {
    $id?: string;
    settings: string; // JSON string of task settings
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