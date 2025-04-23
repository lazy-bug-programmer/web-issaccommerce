/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef, JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getUserTasks, updateTask } from "@/lib/actions/task.action";
import { Task } from "@/lib/domains/task.domain";
import { LockIcon, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyRainAnimation } from "@/components/animations/money-rain";
import { RainbowExplosion } from "@/components/animations/rainbox-explosion";
import { FireworksDisplay } from "@/components/animations/fireworks-display";
import { CoinShower } from "@/components/animations/coin-shower";
import { BalloonRelease } from "@/components/animations/baloon-release";
import { CreditCardRain } from "../animations/credit-card-rain";
import { DiamondShower } from "../animations/diamond-shower";
import { ShoppingBags } from "../animations/shopping-bags";
import { GiftCards } from "../animations/gift-card";
import { useRouter } from "next/navigation";
import {
  getTaskSettingsById,
  getTaskSettingsByAdminId,
} from "@/lib/actions/task-settings.action";
import { getUserOrders } from "@/lib/actions/orders.action";
import { Orders } from "@/lib/domains/orders.domain";
import { TaskItem } from "@/lib/actions/task-settings.action";
import { toast } from "sonner";
import {
  getProductById,
  updateProduct,
  getProductImage,
} from "@/lib/actions/product.action";
import { Product } from "@/lib/domains/products.domain";
import { getUserSales, updateSale } from "@/lib/actions/sales.action";
import { Sale } from "@/lib/domains/sales.domain";
import { createOrder } from "@/lib/actions/orders.action";
import { getReferralCodeByCode } from "@/lib/actions/referral-code.action";
import { getAdminById } from "@/lib/actions/admin.action";
import { getUserPrefs } from "@/lib/actions/auth.action";
import { productCache } from "@/lib/utils/product-cache";

// Types for the progress JSON structure
interface ProgressData {
  [key: string]: boolean;
}

// Type for animation components
type AnimationComponent = () => JSX.Element;

export default function TaskCard() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiWidth, setConfettiWidth] = useState(0);
  const [confettiHeight, setConfettiHeight] = useState(0);
  const [activeAnimation, setActiveAnimation] = useState<{
    component: AnimationComponent | null;
    visible: boolean;
  }>({ component: null, visible: false });
  const [completionDialog, setCompletionDialog] = useState<{
    open: boolean;
    taskId: string;
    taskKey: string;
    resetStatus?: string;
    taskRequirements?: TaskItem | null;
    isRequirementMet: boolean;
  }>({ open: false, taskId: "", taskKey: "", isRequirementMet: false });
  const [taskSettings, setTaskSettings] = useState<Record<
    string,
    TaskItem
  > | null>(null);
  const [userOrders, setUserOrders] = useState<Orders[] | null>(null);
  const [ordersFetched, setOrdersFetched] = useState(false);
  const [productDetails, setProductDetails] = useState<
    Record<string, Product | null>
  >({});
  const [loadingProducts, setLoadingProducts] = useState<
    Record<string, boolean>
  >({});
  const [userSale, setUserSale] = useState<Sale | null>(null);

  // New state for product dialog
  const [productDialog, setProductDialog] = useState<{
    open: boolean;
    productId: string;
    taskId: string;
    taskKey: string;
  }>({ open: false, productId: "", taskId: "", taskKey: "" });

  // New state for admin and admin task settings
  const [adminId, setAdminId] = useState<string | null>(null);
  const [adminTaskSettings, setAdminTaskSettings] = useState<Record<
    string,
    TaskItem
  > | null>(null);

  // Timer reference for animation
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dialogTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Map to store task animations
  const taskAnimationsRef = useRef<Map<string, AnimationComponent>>(new Map());

  // List of available animations
  const animations: AnimationComponent[] = [
    MoneyRainAnimation,
    RainbowExplosion,
    FireworksDisplay,
    CoinShower,
    BalloonRelease,
    CreditCardRain,
    DiamondShower,
    ShoppingBags,
    GiftCards,
  ];

  // Function to get a random animation
  const getRandomAnimation = (): AnimationComponent => {
    const randomIndex = Math.floor(Math.random() * animations.length);
    return animations[randomIndex];
  };

  // Function to assign animations to tasks
  const assignAnimationsToTasks = (taskList: Task[]) => {
    taskList.forEach((task) => {
      if (!task.progress) return;

      try {
        const progressData: ProgressData = JSON.parse(task.progress);
        Object.keys(progressData).forEach((key) => {
          // Only assign if not already assigned
          if (!taskAnimationsRef.current.has(`${task.$id}-${key}`)) {
            taskAnimationsRef.current.set(
              `${task.$id}-${key}`,
              getRandomAnimation()
            );
          }
        });
      } catch (error) {
        console.error("Error parsing progress data:", error);
      }
    });
  };

  // Function to fetch product details for task requirements
  const fetchProductDetails = async (productId: string) => {
    if (loadingProducts[productId] || productDetails[productId]) {
      return;
    }

    setLoadingProducts((prev) => ({ ...prev, [productId]: true }));

    try {
      // Use getOrFetch from cache to prevent duplicate requests and ensure caching
      const product = await productCache.getOrFetch(productId);

      if (product) {
        setProductDetails((prev) => ({
          ...prev,
          [productId]: product,
        }));
      }
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error);
    } finally {
      setLoadingProducts((prev) => ({ ...prev, [productId]: false }));
    }
  };

  // Add new function to fetch multiple products at once
  const fetchMultipleProducts = async (productIds: string[]) => {
    // Filter out products that are already loaded or being loaded
    const idsToFetch = productIds.filter(
      (id) => !productDetails[id] && !loadingProducts[id]
    );

    if (idsToFetch.length === 0) return;

    // Mark all these products as loading
    const newLoadingState = idsToFetch.reduce((acc, id) => {
      acc[id] = true;
      return acc;
    }, {} as Record<string, boolean>);

    setLoadingProducts((prev) => ({ ...prev, ...newLoadingState }));

    try {
      // Use batch fetch from cache
      const products = await productCache.batchFetch(idsToFetch);

      // Update product details
      setProductDetails((prev) => ({
        ...prev,
        ...products,
      }));
    } catch (error) {
      console.error("Error fetching multiple products:", error);
    } finally {
      // Mark all as no longer loading
      const completedLoadingState = idsToFetch.reduce((acc, id) => {
        acc[id] = false;
        return acc;
      }, {} as Record<string, boolean>);

      setLoadingProducts((prev) => ({ ...prev, ...completedLoadingState }));
    }
  };

  // Function to fetch user's referral code from preferences and associated admin
  const fetchUserReferralAdmin = async () => {
    try {
      // Get user preferences to find referral code
      const userPrefsResult = await getUserPrefs();
      if (userPrefsResult.error || !userPrefsResult.data) {
        console.log("No user preferences found or error fetching them");
        return null;
      }

      const referralCode = userPrefsResult.data.referralCode;
      if (!referralCode) {
        console.log("No referral code found in user preferences");
        return null;
      }

      // Validate the referral code and get the admin ID
      const referralResult = await getReferralCodeByCode(referralCode);
      if (referralResult.error || !referralResult.data) {
        console.log("Invalid referral code or error fetching it");
        return null;
      }

      const adminUserId = referralResult.data.belongs_to;
      if (!adminUserId) {
        console.log("No admin associated with this referral code");
        return null;
      }

      // Fetch admin details if needed
      const adminResult = await getAdminById(adminUserId);
      if (adminResult.error || !adminResult.data) {
        console.log("Error fetching admin details");
        return null;
      }

      // Set the admin ID for later use
      setAdminId(adminUserId);
      return adminUserId;
    } catch (error) {
      console.error("Error fetching user's referral admin:", error);
      return null;
    }
  };

  // Update the task settings function to use batch fetching
  const fetchTaskSettings = async () => {
    try {
      // First fetch default task settings
      const result = await getTaskSettingsById("task-settings");
      if (result.data) {
        const settingsData = JSON.parse(result.data.settings);
        setTaskSettings(settingsData);

        // Collect all product IDs for batch fetching
        const productIds: string[] = [];
        Object.values(settingsData).forEach((task: any) => {
          if (task.product_id && task.product_id !== "") {
            productIds.push(task.product_id);
          }
        });

        // Fetch all products at once
        if (productIds.length > 0) {
          await fetchMultipleProducts(productIds);
        }
      } else {
        console.error("No default task settings found");
      }

      // Now try to fetch admin-specific task settings if we have an admin ID
      const userAdminId = adminId || (await fetchUserReferralAdmin());
      if (userAdminId) {
        await fetchAdminTaskSettings(userAdminId);
      }
    } catch (error) {
      console.error("Error fetching task settings:", error);
    }
  };

  // Also update the admin task settings function
  const fetchAdminTaskSettings = async (adminId: string) => {
    try {
      const result = await getTaskSettingsByAdminId(adminId);
      if (result.data) {
        if (result.data.settings) {
          const settingsData = JSON.parse(result.data.settings);
          setAdminTaskSettings(settingsData);

          // Collect all product IDs for batch fetching
          const productIds: string[] = [];
          Object.values(settingsData).forEach((task: any) => {
            if (task.product_id && task.product_id !== "") {
              productIds.push(task.product_id);
            }
          });

          // Fetch all products at once
          if (productIds.length > 0) {
            await fetchMultipleProducts(productIds);
          }
        } else {
          console.log(
            `Admin task settings found but has no settings data for ${adminId}`
          );
        }
      } else {
        console.log(`No task settings found for admin ${adminId}`);
      }
    } catch (error) {
      console.error("Error fetching admin task settings:", error);
    }
  };

  // Function to fetch user orders
  const fetchUserOrders = async () => {
    try {
      const result = await getUserOrders();
      if (result.data) {
        setUserOrders(result.data as unknown as Orders[]);
      }
      setOrdersFetched(true);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      setOrdersFetched(true);
    }
  };

  // Function to fetch user sales
  const fetchUserSales = async () => {
    try {
      const result = await getUserSales();
      if (result.data && result.data.length > 0) {
        setUserSale(result.data[0] as unknown as Sale);
      }
    } catch (error) {
      console.error("Error fetching user sales:", error);
    } finally {
    }
  };

  // Function to determine which task setting to use for a specific task
  const getTaskRequirement = (taskKey: string): TaskItem | null => {
    if (!taskSettings) return null;

    // First check if we have admin task settings for this key
    if (adminTaskSettings && adminTaskSettings[taskKey]) {
      const adminTaskSetting = adminTaskSettings[taskKey];

      // If admin task has user_id field, check if it includes the current user
      if (adminTaskSetting.user_id) {
        const userIds = Array.isArray(adminTaskSetting.user_id)
          ? adminTaskSetting.user_id
          : [adminTaskSetting.user_id];

        // Get current user ID
        const currentUserId = userSale?.user_id || null;

        if (currentUserId && userIds.includes(currentUserId)) {
          console.log(
            `Using admin task for ${taskKey} - user is in user_id list`
          );
          return adminTaskSetting;
        }
      } else if (
        adminTaskSetting.product_id &&
        adminTaskSetting.product_id !== ""
      ) {
        // If no user_id restrictions but has a valid product_id, use admin setting
        console.log(`Using admin task for ${taskKey} - no user restrictions`);
        return adminTaskSetting;
      }
    }

    // Fall back to default task setting
    console.log(`Using default task for ${taskKey}`);
    return taskSettings[taskKey];
  };

  // Function to check if user has completed a task requirement - modified for admin tasks
  const hasCompletedTaskRequirement = (taskKey: string): boolean => {
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

  // Enhanced function to fetch tasks - modified to not reset automatically
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const result = await getUserTasks();
      if (result.data) {
        const taskData = result.data as unknown as Task[];

        // Remove automatic task reset logic
        setTasks(taskData);
        assignAnimationsToTasks(taskData);

        if (!taskSettings) {
          await fetchTaskSettings();
        }

        if (!ordersFetched) {
          await fetchUserOrders();
        }

        // Fetch user sales data
        await fetchUserSales();
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    setConfettiWidth(window.innerWidth);
    setConfettiHeight(window.innerHeight);

    const handleResize = () => {
      setConfettiWidth(window.innerWidth);
      setConfettiHeight(window.innerHeight);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // New function to update the user's sale record
  const updateUserSaleRating = async () => {
    try {
      if (!userSale) return;

      const updatedSale = {
        ...userSale,
        number_of_rating: (userSale.number_of_rating || 0) + 1,
      };

      const result = await updateSale(userSale.$id, {
        number_of_rating: updatedSale.number_of_rating,
      });

      if (result.data) {
        setUserSale(result.data as unknown as Sale);
      }
    } catch (error) {
      console.error("Error updating sale rating:", error);
    }
  };

  // Function to check if all tasks are completed
  const areAllTasksCompleted = (progressData: ProgressData): boolean => {
    return Object.values(progressData).every((value) => value === true);
  };

  // Function to reset tasks after completion
  const resetAllTasks = async (taskId: string) => {
    try {
      // Default progress structure with all tasks set to false
      const defaultProgress = {
        task1: false,
        task2: false,
        task3: false,
        task4: false,
        task5: false,
        task6: false,
        task7: false,
        task8: false,
        task9: false,
        task10: false,
        task11: false,
        task12: false,
        task13: false,
        task14: false,
        task15: false,
        task16: false,
        task17: false,
        task18: false,
        task19: false,
        task20: false,
        task21: false,
        task22: false,
        task23: false,
        task24: false,
        task25: false,
        task26: false,
        task27: false,
        task28: false,
        task29: false,
        task30: false,
        task31: false,
        task32: false,
        task33: false,
        task34: false,
        task35: false,
        task36: false,
      };

      // Update the task with reset progress
      const result = await updateTask(taskId, {
        progress: JSON.stringify(defaultProgress),
        last_edit: new Date().toISOString(),
      });

      if (result.data) {
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.$id === taskId
              ? { ...t, progress: JSON.stringify(defaultProgress) }
              : t
          )
        );

        toast.success(
          "All tasks completed! Tasks have been reset for the next round."
        );
      }

      return result;
    } catch (error) {
      console.error("Error resetting tasks:", error);
      toast.error("Failed to reset tasks. Please try again.");
      return { error: "Failed to reset tasks" };
    }
  };

  const handleCompleteTask = async (taskId: string, taskKey: string) => {
    try {
      const task = tasks.find((t) => t.$id === taskId);
      if (!task || !task.progress) return;

      const progressData: ProgressData = JSON.parse(task.progress);

      // Only proceed if the task wasn't already completed
      const wasCompleted = progressData[taskKey];
      progressData[taskKey] = true;

      const updatedTasks = tasks.map((t) => {
        if (t.$id === taskId) {
          return { ...t, progress: JSON.stringify(progressData) };
        }
        return t;
      });

      setTasks([...updatedTasks]);

      const result = await updateTask(taskId, {
        progress: JSON.stringify(progressData),
      });

      if (result.data) {
        // If this was a newly completed task (not previously completed),
        // increment the user's sale number_of_rating
        if (!wasCompleted) {
          await updateUserSaleRating();
        }

        // Check if all tasks are now completed
        if (areAllTasksCompleted(progressData)) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);

          // Show a congratulatory message
          toast.success("Congratulations! You've completed all tasks!", {
            duration: 5000,
          });

          // Wait for 5 seconds before resetting tasks to allow for celebration
          setTimeout(async () => {
            await resetAllTasks(taskId);
            await fetchTasks();
          }, 5000);
        } else {
          // If not all tasks are completed, just refresh the tasks
          await fetchTasks();
        }
      }
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  const handleUnlockPremium = () => {
    router.push("/contact");
  };

  const openCompletionDialog = async (taskId: string, taskKey: string) => {
    const currentTask = tasks.find((t) => t.$id === taskId);
    let resetStatus = "";

    if (currentTask && currentTask.last_edit) {
      const lastEdit = new Date(currentTask.last_edit);
      const today = new Date();
      const isToday =
        lastEdit.getDate() === today.getDate() &&
        lastEdit.getMonth() === today.getMonth() &&
        lastEdit.getFullYear() === today.getFullYear();

      if (isToday) {
        const hoursSinceReset = Math.floor(
          (today.getTime() - lastEdit.getTime()) / (1000 * 60 * 60)
        );
        if (hoursSinceReset < 24) {
          resetStatus = `Tasks were reset ${hoursSinceReset} hour${
            hoursSinceReset !== 1 ? "s" : ""
          } ago.`;
        }
      }
    }

    if (!taskSettings) {
      await fetchTaskSettings();
    }

    if (!ordersFetched) {
      await fetchUserOrders();
    } else {
      await fetchUserOrders();
    }

    const taskRequirements = getTaskRequirement(taskKey);
    const isRequirementMet = hasCompletedTaskRequirement(taskKey);

    // Fetch product details if not already loaded
    if (
      taskRequirements &&
      taskRequirements.product_id &&
      !productDetails[taskRequirements.product_id]
    ) {
      await fetchProductDetails(taskRequirements.product_id);
    }

    if (taskRequirements && !isRequirementMet && taskRequirements.product_id) {
      console.log(
        "Debug: Order not found even after refresh. This is unexpected."
      );
      console.log("Current user orders:", userOrders);

      toast(
        `Your purchase may still be processing. Please try again in a moment.`
      );

      return;
    }

    const animation =
      taskAnimationsRef.current.get(`${taskId}-${taskKey}`) ||
      getRandomAnimation();

    setActiveAnimation({
      component: animation,
      visible: true,
    });

    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }
    if (dialogTimerRef.current) {
      clearTimeout(dialogTimerRef.current);
    }

    animationTimerRef.current = setTimeout(() => {
      setActiveAnimation((prev) => ({ ...prev, visible: false }));

      setCompletionDialog({
        open: true,
        taskId,
        taskKey,
        resetStatus,
        taskRequirements,
        isRequirementMet,
      });

      animationTimerRef.current = null;
    }, 5000);
  };

  const closeCompletionDialog = () => {
    setCompletionDialog({
      open: false,
      taskId: "",
      taskKey: "",
      isRequirementMet: false,
    });

    setActiveAnimation({
      component: null,
      visible: false,
    });

    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    if (dialogTimerRef.current) {
      clearTimeout(dialogTimerRef.current);
      dialogTimerRef.current = null;
    }

    setTasks([...tasks]);
  };

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
      if (dialogTimerRef.current) {
        clearTimeout(dialogTimerRef.current);
      }
    };
  }, []);

  const getProgressPercentage = (task: Task) => {
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

  const isTaskAvailable = (taskKey: string, progressData: ProgressData) => {
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

  const renderTaskItems = (task: Task) => {
    try {
      if (!task.progress) return null;

      const progressData: ProgressData = JSON.parse(task.progress);

      if (!taskAnimationsRef.current.size) {
        Object.keys(progressData).forEach((key) => {
          taskAnimationsRef.current.set(
            `${task.$id}-${key}`,
            getRandomAnimation()
          );
        });
      }

      return Object.entries(progressData).map(([key, completed]) => {
        const isPaywall = key.startsWith("paywall");
        const available = isTaskAvailable(key, progressData);
        const requirement = getTaskRequirement(key);
        const requirementMet = hasCompletedTaskRequirement(key);
        const requirementExists =
          requirement &&
          requirement.product_id &&
          requirement.product_id !== "";

        return (
          <div
            key={key}
            className={`p-3 rounded-md mb-2 transition-all duration-300 ${
              completed
                ? "bg-green-100 dark:bg-green-900/20"
                : !available && !isPaywall
                ? "bg-gray-100 dark:bg-gray-800"
                : requirementExists && !requirementMet
                ? "bg-amber-100 dark:bg-amber-900/20"
                : "bg-muted/30"
            }`}
          >
            {isPaywall ? (
              <div className="flex items-center gap-2">
                <LockIcon size={16} className="text-amber-500" />
                <div>
                  <h4 className="font-semibold text-amber-500">
                    Premium Content
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Purchase to unlock the next set of tasks
                  </p>
                  {!completed && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 bg-amber-500/10 border-amber-500 text-amber-600"
                      onClick={handleUnlockPremium}
                    >
                      Unlock Premium
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <h4
                    className={`font-semibold capitalize ${
                      !available && !completed
                        ? "text-gray-400 dark:text-gray-500"
                        : ""
                    }`}
                  >
                    {key.replace(/([A-Z])/g, " $1").trim()}{" "}
                    {/* Show admin indicator if using admin task settings */}
                    {adminTaskSettings &&
                      adminTaskSettings[key] &&
                      adminTaskSettings[key].product_id ===
                        requirement?.product_id && (
                        <span className="text-xs text-blue-500 ml-1"></span>
                      )}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {completed
                      ? "Completed!"
                      : !available
                      ? "Complete previous tasks first"
                      : "Please complete the task"}
                  </p>
                </div>
                {!completed && available && (
                  <>
                    {requirementExists && !requirementMet ? (
                      <div className="flex items-center ml-2">
                        <AlertCircle
                          size={16}
                          className="text-amber-500 mr-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/20"
                          onClick={() =>
                            setProductDialog({
                              open: true,
                              productId: requirement.product_id,
                              taskId: task.$id,
                              taskKey: key,
                            })
                          }
                        >
                          Start Your Task
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => openCompletionDialog(task.$id, key)}
                        className="ml-2 bg-gradient-to-r from-green-400 to-emerald-600 hover:from-green-500 hover:to-emerald-700 shadow-sm"
                      >
                        Complete
                      </Button>
                    )}
                  </>
                )}
                {!completed && !available && !isPaywall && (
                  <LockIcon size={16} className="text-gray-400 ml-2" />
                )}
                {completed && (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      });
    } catch (error) {
      console.error("Error rendering task items:", error);
      return <p>Error loading tasks</p>;
    }
  };

  // Function to format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Function to check if trial_bonus_date is today
  const isTrialBonusDateToday = (sale: Sale | null): boolean => {
    if (!sale || !sale.trial_bonus_date) return false;

    const trialBonusDate = new Date(sale.trial_bonus_date);
    const today = new Date();

    return (
      trialBonusDate.getDate() === today.getDate() &&
      trialBonusDate.getMonth() === today.getMonth() &&
      trialBonusDate.getFullYear() === today.getFullYear()
    );
  };

  // Function to handle product completion
  const handleProductCompletion = async (
    productId: string,
    taskId: string,
    taskKey: string
  ) => {
    // Close the product dialog
    setProductDialog({ open: false, productId: "", taskId: "", taskKey: "" });

    // Refresh orders data to make sure we have the latest orders
    try {
      await fetchUserOrders();

      // Refresh task settings and requirements status
      await fetchTaskSettings();

      // After refreshing data, proceed with the animation and confirmation dialog
      openCompletionDialog(taskId, taskKey);
    } catch (error) {
      console.error("Error refreshing data after purchase:", error);
      // Even if refresh fails, try to show the dialog anyway
      openCompletionDialog(taskId, taskKey);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto mb-8 animate-pulse">
        <CardHeader className="bg-muted h-20"></CardHeader>
        <CardContent className="h-40"></CardContent>
      </Card>
    );
  }

  if (!tasks.length) {
    return null;
  }

  return (
    <>
      {showConfetti && (
        <Confetti
          width={confettiWidth}
          height={confettiHeight}
          recycle={false}
          numberOfPieces={500}
        />
      )}

      {activeAnimation.visible && (
        <div className="fixed inset-0 bg-gray-900/70 z-[90]" />
      )}

      {activeAnimation.visible && activeAnimation.component && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <activeAnimation.component />

          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="text-center relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.h2
                className="text-4xl md:text-5xl font-extrabold"
                initial={{ filter: "blur(10px)", opacity: 0 }}
                animate={{
                  filter: [
                    "blur(10px)",
                    "blur(0px)",
                    "blur(0px)",
                    "blur(15px)",
                  ],
                  opacity: [0, 1, 1, 0],
                  scale: [0.8, 1.2, 1, 0.7],
                  textShadow: [
                    "0 0 20px rgba(59, 130, 246, 0.8)",
                    "0 0 40px rgba(16, 185, 129, 0.8)",
                    "0 0 30px rgba(16, 185, 129, 0.6)",
                    "0 0 10px rgba(59, 130, 246, 0.4)",
                  ],
                }}
                transition={{
                  duration: 5,
                  times: [0, 0.2, 0.8, 1],
                  ease: "easeInOut",
                }}
                style={{
                  background: "linear-gradient(to right, #3b82f6, #10b981)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Task Complete!
              </motion.h2>

              <motion.p
                className="text-white text-xl md:text-2xl mt-4 font-medium"
                initial={{ y: 20, opacity: 0 }}
                animate={{
                  y: [20, 0, 0, -20],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 5,
                  times: [0, 0.3, 0.7, 1],
                  ease: "easeInOut",
                }}
                style={{ textShadow: "0 0 10px rgba(0,0,0,0.8)" }}
              >
                Please continue your task
              </motion.p>
            </motion.div>
          </div>
        </div>
      )}

      <div className="mb-10 relative z-10">
        <AnimatePresence>
          {tasks.map((task: Task & { $id: string }) => (
            <motion.div
              key={task.$id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden shadow-lg border-2 hover:border-primary transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Your Learning Path</CardTitle>
                      <CardDescription className="text-white/80">
                        {getProgressPercentage(task) === 100
                          ? "All tasks completed! Great job!"
                          : `${getProgressPercentage(task)}% complete`}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {userSale &&
                        userSale.balance !== undefined &&
                        userSale.balance !== null && (
                          <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg shadow-inner">
                            <p className="text-xs text-white/80">
                              Task Balance:
                            </p>
                            <p className="font-bold text-white">
                              {formatCurrency(userSale.balance)}
                            </p>
                          </div>
                        )}
                      {userSale && isTrialBonusDateToday(userSale) && (
                        <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg shadow-inner">
                          <p className="text-xs text-white/80">Trial Bonus:</p>
                          <p className="font-bold text-white">
                            {formatCurrency(userSale.trial_bonus)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">
                          Overall Progress
                        </span>
                        <span className="text-sm font-medium">
                          {getProgressPercentage(task)}%
                        </span>
                      </div>
                      <Progress
                        value={getProgressPercentage(task)}
                        className="h-3 transition-all duration-1000"
                      />
                    </div>

                    <div className="mt-4 space-y-1">
                      <h4 className="font-semibold mb-3">Task List</h4>
                      <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                        {renderTaskItems(task)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Dialog
        open={completionDialog.open}
        onOpenChange={(open) => {
          if (!open) closeCompletionDialog();
        }}
        modal={true}
      >
        <DialogContent className="sm:max-w-md backdrop-blur-sm bg-white/90 dark:bg-gray-950/90 border-2 border-primary shadow-2xl z-50">
          <div className="relative z-10">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Congratulations!
              </DialogTitle>
              <DialogDescription>
                You&apos;ve completed your task! Click the button below to
                confirm and continue to unlock the next task.
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 flex items-center justify-center">
              <div className="bg-white/90 dark:bg-black/90 p-5 rounded-lg text-center shadow-lg border border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold mb-2">
                  Great job on completing this step!
                </h3>
                <p className="text-sm mb-4">Continue to unlock more tasks.</p>
                {completionDialog.resetStatus && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 mb-3">
                    {completionDialog.resetStatus}
                  </p>
                )}
                {completionDialog.taskRequirements?.product_id &&
                  completionDialog.isRequirementMet && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 mb-3">
                      {`Required purchase: ${
                        completionDialog.taskRequirements.amount
                          ? `${completionDialog.taskRequirements.amount} × `
                          : ""
                      }${
                        productDetails[
                          completionDialog.taskRequirements.product_id
                        ]?.name ||
                        `Product ${completionDialog.taskRequirements.product_id}`
                      }`}
                    </p>
                  )}
                <div className="w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600 mt-2"></div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  handleCompleteTask(
                    completionDialog.taskId,
                    completionDialog.taskKey
                  );
                  closeCompletionDialog();
                }}
                className="bg-gradient-to-r from-green-400 to-emerald-600 hover:from-green-500 hover:to-emerald-700 shadow-sm"
                size="lg"
              >
                Complete Task
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog
        open={productDialog.open}
        onOpenChange={(open) => {
          if (!open)
            setProductDialog({
              open: false,
              productId: "",
              taskId: "",
              taskKey: "",
            });
        }}
        modal={true}
      >
        <DialogContent className="sm:max-w-md">
          {productDialog.productId && (
            <ProductTaskDialog
              productId={productDialog.productId}
              onComplete={() =>
                handleProductCompletion(
                  productDialog.productId,
                  productDialog.taskId,
                  productDialog.taskKey
                )
              }
              onCancel={() =>
                setProductDialog({
                  open: false,
                  productId: "",
                  taskId: "",
                  taskKey: "",
                })
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// New component for the product task dialog
function ProductTaskDialog({
  productId,
  onComplete,
  onCancel,
}: {
  productId: string;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const router = useRouter(); // Added router hook for navigation
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [userSale, setUserSale] = useState<Sale | null>(null);
  const [hasSufficientFunds, setHasSufficientFunds] = useState(false);
  const [totalAvailableFunds, setTotalAvailableFunds] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [requiredAmount, setRequiredAmount] = useState<number | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        // Use enhanced cache method
        const product = await productCache.getOrFetch(productId);

        if (product) {
          setProduct(product);
        } else {
          toast.error("Product not found");
        }
      } catch (error) {
        console.error("Failed to fetch product:", error);
        toast.error("Failed to load product details");
      } finally {
        setLoading(false);
      }
    };

    const fetchUserSale = async () => {
      try {
        const result = await getUserSales();
        if (result.data && result.data.length > 0) {
          setUserSale(result.data[0] as unknown as Sale);
        }
      } catch (error) {
        console.error("Error fetching user sales data:", error);
      }
    };

    // Fetch task settings to get required amount
    const fetchTaskSettingsForProduct = async () => {
      try {
        const result = await getTaskSettingsById("task-settings");
        if (result.data && result.data.settings) {
          const settingsData = JSON.parse(result.data.settings);

          // Find task that requires this product
          const taskEntry = Object.entries(settingsData).find(
            ([_, taskItem]: [string, unknown]) =>
              typeof taskItem === "object" &&
              taskItem !== null &&
              "product_id" in taskItem &&
              taskItem.product_id === productId
          );

          if (
            taskEntry &&
            typeof taskEntry[1] === "object" &&
            taskEntry[1] !== null &&
            "amount" in taskEntry[1] &&
            taskEntry[1].amount
          ) {
            const amount = parseInt(String(taskEntry[1].amount));
            if (!isNaN(amount)) {
              setRequiredAmount(amount);
              setQuantity(amount); // Set initial quantity to required amount
            }
          }
        }
      } catch (error) {
        console.error("Error fetching task settings for product:", error);
      }
    };

    if (productId) {
      fetchProduct();
      fetchUserSale();
      fetchTaskSettingsForProduct();
    }
  }, [productId]);

  // Check if user has sufficient funds when product and userSale are loaded
  useEffect(() => {
    if (product && userSale) {
      const finalPrice = calculatePrice(product.price, product.discount_rate);
      const totalCost = finalPrice * quantity;

      // Check if trial_bonus_date is today
      const today = new Date().toDateString();
      const isTrialBonusToday = userSale.trial_bonus_date
        ? new Date(userSale.trial_bonus_date).toDateString() === today
        : false;

      // Calculate available money based on trial bonus date
      const totalMoney = isTrialBonusToday
        ? (userSale.trial_bonus || 0) + (userSale.balance || 0)
        : userSale.balance || 0;

      setTotalAvailableFunds(totalMoney);

      // Set state based on whether user has enough money
      if (totalMoney < totalCost) {
        setErrorMessage(
          `Insufficient balance. Please topup via Customer Service`
        );
        setHasSufficientFunds(false);
      } else {
        setHasSufficientFunds(true);
        setErrorMessage("");
      }
    }
  }, [product, userSale, quantity]);

  // Calculate discounted price
  const calculatePrice = (price: number, discountRate: number) => {
    return price - (price * discountRate) / 100;
  };

  // Format currency
  const formatCurrency = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const handlePurchaseAndComplete = async () => {
    if (!product || !userSale || !hasSufficientFunds) {
      return;
    }

    // Verify quantity matches required amount if specified
    if (requiredAmount !== null && quantity !== requiredAmount) {
      setErrorMessage(
        `You must purchase exactly ${requiredAmount} units to complete this task.`
      );
      return;
    }

    setIsProcessing(true);

    try {
      const finalPrice = calculatePrice(product.price, product.discount_rate);
      const totalCost = finalPrice * quantity;

      // 1. Update product quantity
      const updatedProduct = await updateProduct(product.$id, {
        quantity: product.quantity - quantity,
      });

      if (!updatedProduct.data) {
        throw new Error("Failed to update product quantity");
      }

      // 2. Calculate cashback (3% of total cost)
      const cashbackAmount = totalCost * 0.03;

      // 3. Update user's balance based on available funds
      const updateData: Partial<Sale> = {
        balance: (userSale.balance || 0) + cashbackAmount,
        today_bonus: (userSale.today_bonus || 0) + cashbackAmount,
        today_bonus_date: new Date(),
        total_earning: (userSale.total_earning || 0) + cashbackAmount,
      };

      const updatedSale = await updateSale(userSale.$id, updateData);

      if (!updatedSale.data) {
        throw new Error("Failed to update user balance");
      }

      // 4. Create an order record
      const orderResult = await createOrder({
        product_id: product.$id,
        amount: quantity,
        shipment_automation_id: "",
      });

      if (!orderResult.data) {
        console.error(
          "Warning: Order record creation failed, but payment was processed"
        );
      }

      toast.success(
        `Successfully purchased ${quantity} ${
          product.name
        }! Earned ${cashbackAmount.toFixed(2)} cashback.`
      );

      // Small delay to ensure backend has processed the order
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Call the onComplete to continue the task flow
      onComplete();
    } catch (error) {
      console.error("Error processing purchase:", error);
      setErrorMessage("Failed to process purchase. Please try again.");
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p>Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Product not found</h3>
        <p className="mt-2 text-muted-foreground">
          The requested product could not be found.
        </p>
        <Button className="mt-4" onClick={onCancel}>
          Close
        </Button>
      </div>
    );
  }

  const finalPrice = calculatePrice(product.price, product.discount_rate);
  const totalCost = finalPrice * quantity;

  return (
    <div className="p-4">
      <DialogHeader>
        <DialogTitle>Complete Task with {product.name}</DialogTitle>
        <DialogDescription>
          {hasSufficientFunds
            ? `Purchase ${
                requiredAmount ? `${requiredAmount} units of` : ""
              } this product to complete your task`
            : "You need more funds to purchase this product"}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-6 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Product image carousel */}
        <div className="aspect-square w-full">
          {product.image_urls && product.image_urls.length > 0 ? (
            <ProductImageCarousel
              imageUrls={product.image_urls}
              productName={product.name}
            />
          ) : (
            <img
              src="/placeholder.svg?height=200&width=200"
              alt={product.name}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div>
          <h3 className="text-xl font-semibold">{product.name}</h3>
          <div className="mt-1 text-muted-foreground">
            <p className={showFullDescription ? "" : "line-clamp-3"}>
              {product.description}
            </p>
            {product.description && product.description.length > 150 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-sm text-blue-500 hover:text-blue-700 mt-1 focus:outline-none"
              >
                {showFullDescription ? "Show less" : "Show more"}
              </button>
            )}
          </div>

          <div className="mt-4 flex items-center flex-wrap">
            {product.discount_rate > 0 ? (
              <>
                <p className="text-2xl font-bold">
                  {formatCurrency(finalPrice)}
                </p>
                <p className="ml-2 text-muted-foreground line-through">
                  {formatCurrency(product.price)}
                </p>
                <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
                  {product.discount_rate}% OFF
                </span>
              </>
            ) : (
              <p className="text-2xl font-bold">
                {formatCurrency(product.price)}
              </p>
            )}
          </div>
        </div>

        {requiredAmount !== null && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
              <AlertCircle size={16} />
              This task requires purchasing exactly {requiredAmount}{" "}
              {requiredAmount === 1 ? "unit" : "units"}
            </p>
          </div>
        )}

        <div className="bg-muted/20 p-3 rounded-md">
          <p className="flex justify-between font-medium">
            <span>Cost:</span>
            <span>{formatCurrency(totalCost)}</span>
          </p>
          {requiredAmount !== null && (
            <p className="text-sm text-muted-foreground mt-1">
              Fixed quantity: {requiredAmount}{" "}
              {requiredAmount === 1 ? "unit" : "units"}
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 text-red-500 bg-red-50 p-2 rounded border border-red-200">
            <AlertCircle size={16} />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        <div className="border rounded p-3 bg-muted/30">
          <div className="text-sm space-y-1">
            <p className="font-medium">Your Balance:</p>
            <div className="flex flex-col text-muted-foreground">
              {userSale?.trial_bonus_date &&
              new Date(userSale.trial_bonus_date).toDateString() ===
                new Date().toDateString() ? (
                <span>Trial: {formatCurrency(userSale?.trial_bonus || 0)}</span>
              ) : null}
              <span>Regular: {formatCurrency(userSale?.balance || 0)}</span>
              <span
                className={`border-t pt-1 font-medium ${
                  hasSufficientFunds ? "text-foreground" : "text-red-500"
                }`}
              >
                Total: {formatCurrency(totalAvailableFunds)}
                {!hasSufficientFunds &&
                  ` (-${formatCurrency(
                    totalCost - totalAvailableFunds
                  )}, please contact Customer Service)`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="mt-6 flex flex-row gap-2 w-full">
        <div>
          <Button variant="outline" onClick={onCancel} className="w-full">
            Cancel
          </Button>
          <Button
            variant="outline"
            className="w-full bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
            onClick={() => router.push("/contact")}
          >
            Customer Service
          </Button>
        </div>

        <Button
          className="w-full bg-gradient-to-r from-green-400 to-emerald-600 hover:from-green-500 hover:to-emerald-700"
          onClick={handlePurchaseAndComplete}
          disabled={isProcessing || !hasSufficientFunds}
        >
          {isProcessing
            ? "Processing..."
            : hasSufficientFunds
            ? "Complete"
            : "Insufficient Funds"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// Image component that handles loading the image
function ProductImage({
  imageId,
  productName,
}: {
  imageId: string;
  productName: string;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchImage = async () => {
      try {
        // Use the cache's fetchImage method to get the image URL
        const cachedUrl = await productCache.fetchImage(imageId);

        if (!isMounted) return;

        if (cachedUrl) {
          setImageUrl(cachedUrl);
          setIsLoading(false);
        } else {
          setError("Failed to load image");
          setIsLoading(false);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading image:", err);
        setError("Error loading image");
        setIsLoading(false);
      }
    };

    if (imageId) {
      fetchImage();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
      // Don't revoke URLs that are cached - they'll be managed by the cache
    };
  }, [imageId]);

  if (isLoading) {
    return (
      <div className="aspect-square w-full bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="aspect-square w-full bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400">{error || "No image"}</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={productName}
      className="h-full w-full object-cover"
    />
  );
}

// Carousel component for displaying multiple product images
function ProductImageCarousel({
  imageUrls,
  productName,
}: {
  imageUrls: string[];
  productName: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? imageUrls.length - 1 : prevIndex - 1
    );
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) =>
      prevIndex === imageUrls.length - 1 ? 0 : prevIndex + 1
    );
  };

  // If no images, show placeholder
  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className="aspect-square w-full bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400">No images</span>
      </div>
    );
  }

  // If only one image, don't need navigation
  if (imageUrls.length === 1) {
    return <ProductImage imageId={imageUrls[0]} productName={productName} />;
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden">
      <div className="h-full w-full">
        <ProductImage
          imageId={imageUrls[currentIndex]}
          productName={productName}
        />
      </div>

      {/* Navigation arrows */}
      <div className="absolute inset-0 flex items-center justify-between p-2">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-full bg-white/70 shadow hover:bg-white/90"
          onClick={goToPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-full bg-white/70 shadow hover:bg-white/90"
          onClick={goToNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
        {imageUrls.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 w-1.5 rounded-full ${
              index === currentIndex ? "bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
