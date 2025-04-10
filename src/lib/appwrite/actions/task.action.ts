/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createAdminClient, getLoggedInUser } from "@/lib/appwrite/server";
import { Task } from "@/lib/domains/task.domain";
import { Query } from "node-appwrite";

const DATABASE_ID = 'Core';
const TASKS_COLLECTION_ID = 'Task';

// CREATE
export async function createTask(task: Task) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const newTask = await databases.createDocument(
            DATABASE_ID,
            TASKS_COLLECTION_ID,
            "unique()",
            {
                user_id: task.user_id,
                progress: task.progress,
            }
        );

        return { data: newTask };
    } catch (error: any) {
        console.error("Error creating task:", error);
        return { error: error.message || "Failed to create task" };
    }
}

// READ
export async function getTasks(limit = 10) {
    try {
        const { databases } = await createClient();

        const tasks = await databases.listDocuments(
            DATABASE_ID,
            TASKS_COLLECTION_ID,
            [Query.limit(limit)]
        );

        return { data: tasks.documents };
    } catch (error: any) {
        console.error("Error getting tasks:", error);
        return { error: error.message || "Failed to get tasks" };
    }
}

export async function getTaskById(taskId: string) {
    try {
        const { databases } = await createClient();

        const task = await databases.getDocument(
            DATABASE_ID,
            TASKS_COLLECTION_ID,
            taskId
        );

        return { data: task };
    } catch (error: any) {
        console.error("Error getting task:", error);
        return { error: error.message || "Failed to get task" };
    }
}

export async function getUserTasks() {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const tasks = await databases.listDocuments(
            DATABASE_ID,
            TASKS_COLLECTION_ID,
            [Query.equal("user_id", user.$id)]
        );

        // If user has no tasks, create a default one with JSON progress structure
        if (tasks.documents.length === 0) {
            // Default progress structure with all tasks set to false
            const defaultProgress = {
                task1: false,
                task2: false,
                task3: false,
                task4: false,
                paywall1: false,
                task5: false,
                task6: false,
                task7: false,
                task8: false,
                paywall2: false,
                task9: false,
                task10: false
            };

            const newTask = await databases.createDocument(
                DATABASE_ID,
                TASKS_COLLECTION_ID,
                "unique()",
                {
                    user_id: user.$id,
                    progress: JSON.stringify(defaultProgress)
                }
            );

            return { data: [newTask] };
        }

        return { data: tasks.documents };
    } catch (error: any) {
        console.error("Error getting user tasks:", error);
        return { error: error.message || "Failed to get user tasks" };
    }
}

// UPDATE
export async function updateTask(taskId: string, updates: Partial<Task>) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const updatedTask = await databases.updateDocument(
            DATABASE_ID,
            TASKS_COLLECTION_ID,
            taskId,
            updates
        );

        return { data: updatedTask };
    } catch (error: any) {
        console.error("Error updating task:", error);
        return { error: error.message || "Failed to update task" };
    }
}

// DELETE
export async function deleteTask(taskId: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            TASKS_COLLECTION_ID,
            taskId
        );

        return { message: "Task deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting task:", error);
        return { error: error.message || "Failed to delete task" };
    }
}

// Admin operations
export async function adminDeleteTask(taskId: string) {
    try {
        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            TASKS_COLLECTION_ID,
            taskId
        );

        return { message: "Task deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting task:", error);
        return { error: error.message || "Failed to delete task" };
    }
}

// Additional task-specific functions
export async function updateTaskProgress(taskId: string, progress: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const updatedTask = await databases.updateDocument(
            DATABASE_ID,
            TASKS_COLLECTION_ID,
            taskId,
            {
                progress: progress
            }
        );

        return { data: updatedTask };
    } catch (error: any) {
        console.error("Error updating task progress:", error);
        return { error: error.message || "Failed to update task progress" };
    }
}

// Helper function to create a regular client
async function createClient() {
    const { databases } = await createAdminClient();
    return { databases };
}

