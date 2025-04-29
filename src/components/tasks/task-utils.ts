import { Task } from "@/lib/domains/task.domain";
import { Orders } from "@/lib/domains/orders.domain";
import { TaskItem } from "@/lib/actions/task-settings.action";
import { Sale } from "@/lib/domains/sales.domain";

// Types for the progress JSON structure
interface ProgressData {
    [key: string]: boolean;
}

// Function to check if task is available based on previous task completion
export const isTaskAvailable = (
    taskKey: string,
    progressData: ProgressData
): boolean => {
    if (taskKey.startsWith("paywall")) return true;

    const taskKeys = Object.keys(progressData).filter(
        (k) => !k.startsWith("paywall")
    );
    const paywallKeys = Object.keys(progressData).filter((k) =>
        k.startsWith("paywall")
    );

    if (!taskKey.startsWith("paywall")) {
        const taskMatch = taskKey.match(/task(\d+)/);
        if (taskMatch) {
            const currentTaskNum = parseInt(taskMatch[1]);

            if (currentTaskNum === 1) return true;

            const prevTaskKey = `task${currentTaskNum - 1}`;

            if (progressData[prevTaskKey] === true) return true;
        }
    }

    const currentIndex = taskKeys.indexOf(taskKey);

    if (currentIndex === 0) return true;

    if (currentIndex > 0) {
        const previousTask = taskKeys[currentIndex - 1];
        const previousTaskCompleted = progressData[previousTask] === true;

        if (!previousTaskCompleted) return false;
    }

    const requiredPaywalls = paywallKeys.filter((paywallKey) => {
        const paywallMatch = paywallKey.match(/paywall(\d+)/);
        const taskMatch = taskKey.match(/task(\d+)/);

        if (paywallMatch && taskMatch) {
            const paywallIndex = parseInt(paywallMatch[1]);
            const taskIndex = parseInt(taskMatch[1]);
            return paywallIndex < taskIndex;
        }

        const paywallPosition = Object.keys(progressData).indexOf(paywallKey);
        const taskPosition = Object.keys(progressData).indexOf(taskKey);
        return paywallPosition < taskPosition;
    });

    const allRequiredPaywallsCompleted =
        requiredPaywalls.length === 0 ||
        requiredPaywalls.every((paywall) => progressData[paywall] === true);

    return allRequiredPaywallsCompleted;
};

// Calculate progress percentage for a task
export const getProgressPercentage = (task: Task): number => {
    try {
        if (!task.progress) return 0;

        const progressData: ProgressData = JSON.parse(task.progress);
        const totalTasks = Object.keys(progressData).length;
        const completedTasks = Object.values(progressData).filter(
            (val) => val === true
        ).length;

        return Math.round((completedTasks / totalTasks) * 100);
    } catch (error) {
        console.error("Error calculating progress:", error);
        return 0;
    }
};

// Check if user has completed the task requirement (purchased required product)
export const hasCompletedTaskRequirement = (
    taskKey: string,
    userOrders: Orders[] | null,
    getTaskRequirement: (taskKey: string) => TaskItem | null
): boolean => {
    if (!userOrders) {
        return false;
    }

    const taskRequirement = getTaskRequirement(taskKey);
    if (
        !taskRequirement ||
        !taskRequirement.product_id ||
        taskRequirement.product_id === ""
    ) {
        return true;
    }

    const today = new Date();

    return userOrders.some((order) => {
        const orderDate = new Date(order.ordered_at);
        const isToday =
            orderDate.getDate() === today.getDate() &&
            orderDate.getMonth() === today.getMonth() &&
            orderDate.getFullYear() === today.getFullYear();

        const matchesProduct = order.product_id === taskRequirement.product_id;
        const matchesAmount =
            !taskRequirement.amount ||
            taskRequirement.amount === "" ||
            Number(order.amount) >= Number(taskRequirement.amount);

        return isToday && matchesProduct && matchesAmount;
    });
};

// Function to format currency values
export const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return "৳ 0.00";

    return `৳ ${amount.toFixed(2)}`;
};

// Function to check if trial_bonus_date is today
export const isTrialBonusDateToday = (sale: Sale | null): boolean => {
    if (!sale || !sale.trial_bonus_date) return false;

    const trialBonusDate = new Date(sale.trial_bonus_date);
    const today = new Date();

    return (
        trialBonusDate.getDate() === today.getDate() &&
        trialBonusDate.getMonth() === today.getMonth() &&
        trialBonusDate.getFullYear() === today.getFullYear()
    );
};
