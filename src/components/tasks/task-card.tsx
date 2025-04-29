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
import { Progress } from "@/components/ui/progress";
import { getUserTasks, updateTask } from "@/lib/actions/task.action";
import { Task } from "@/lib/domains/task.domain";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { Product } from "@/lib/domains/products.domain";
import { getUserSales, updateSale } from "@/lib/actions/sales.action";
import { Sale } from "@/lib/domains/sales.domain";
import { getReferralCodeByCode } from "@/lib/actions/referral-code.action";
import { getAdminById } from "@/lib/actions/admin.action";
import { getUserPrefs } from "@/lib/actions/auth.action";
import { productCache } from "@/lib/utils/product-cache";
import { TaskItemComponent } from "./task-item";
import { CompletionDialog } from "./completion-dialog";
import { ProductTaskDialog } from "./product-task-dialog";
import {
  isTaskAvailable,
  getProgressPercentage,
  hasCompletedTaskRequirement,
  formatCurrency,
  isTrialBonusDateToday,
} from "./task-utils";

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

  // Add taskItemRefs to store references to task elements for scrolling
  const taskItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  // Function to fetch multiple products at once
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

  // Modified to fetch admin task settings first, then default task settings
  const fetchTaskSettings = async () => {
    try {
      // 1. First fetch admin task settings if we have an admin ID
      const userAdminId = adminId || (await fetchUserReferralAdmin());

      if (userAdminId) {
        const adminSettingsResult = await fetchAdminTaskSettings(userAdminId);

        // 2. If admin task settings specify a default_task_settings_id, use that
        if (
          adminSettingsResult &&
          adminSettingsResult.default_task_settings_id
        ) {
          await fetchDefaultTaskSettings(
            adminSettingsResult.default_task_settings_id
          );
        } else {
          // Fallback to the original "task-settings" if no default is specified
          await fetchDefaultTaskSettings("task-settings");
        }
      } else {
        // If no admin is associated, fallback to the original "task-settings"
        await fetchDefaultTaskSettings("task-settings");
      }
    } catch (error) {
      console.error("Error fetching task settings:", error);
      // Fallback to default task settings if anything fails
      await fetchDefaultTaskSettings("task-settings");
    }
  };

  // Split the original fetchTaskSettings into two functions
  const fetchDefaultTaskSettings = async (taskSettingsId: string) => {
    try {
      const result = await getTaskSettingsById(taskSettingsId);
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

        return result.data;
      } else {
        console.error(`No task settings found with ID ${taskSettingsId}`);
        return null;
      }
    } catch (error) {
      console.error(
        `Error fetching task settings with ID ${taskSettingsId}:`,
        error
      );
      return null;
    }
  };

  // Modified to return the admin task settings
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

          return result.data;
        } else {
          console.log(
            `Admin task settings found but has no settings data for ${adminId}`
          );
        }
      } else {
        console.log(`No task settings found for admin ${adminId}`);
      }
      return null;
    } catch (error) {
      console.error("Error fetching admin task settings:", error);
      return null;
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

  // Enhanced function to fetch tasks
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const result = await getUserTasks();
      if (result.data) {
        const taskData = result.data as unknown as Task[];

        // Set tasks without automatic task reset logic
        setTasks(taskData);
        assignAnimationsToTasks(taskData);

        // Modified order:
        // 1. Fetch task settings (which now internally fetches in the correct order)
        // 2. Fetch orders and sales data
        if (!taskSettings) {
          await fetchTaskSettings();
        }

        if (!ordersFetched) {
          await fetchUserOrders();
        }

        // Fetch user sales data
        await fetchUserSales();

        // Schedule scrolling to first incomplete task after everything is loaded
        setTimeout(() => scrollToFirstIncompleteTask(taskData), 500);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add function to scroll to the first incomplete task
  const scrollToFirstIncompleteTask = (taskData: Task[]) => {
    try {
      // Process each task to find the first incomplete task
      for (const task of taskData) {
        if (!task.progress) continue;

        const progressData: ProgressData = JSON.parse(task.progress);
        const taskKeys = Object.keys(progressData).filter(
          (k) => !k.startsWith("paywall")
        );

        // Find the first incomplete task that is available
        for (const key of taskKeys) {
          if (!progressData[key] && isTaskAvailable(key, progressData)) {
            // Get the task element ref
            const taskElementRef = taskItemRefs.current.get(
              `${task.$id}-${key}`
            );

            if (taskElementRef) {
              // Scroll to the element with smooth behavior
              taskElementRef.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });

              // Highlight the task briefly
              taskElementRef.classList.add("highlight-task");
              setTimeout(() => {
                taskElementRef.classList.remove("highlight-task");
              }, 2000);

              return; // Stop after finding the first incomplete task
            }
          }
        }
      }
    } catch (error) {
      console.error("Error scrolling to incomplete task:", error);
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

          // Remove the automatic reset
          // No longer waiting 5 seconds to reset tasks
          await fetchTasks(); // Just refresh the tasks
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
          // Indicate whether the tasks were reset automatically or manually
          const resetType =
            currentTask.allow_system_reset === false
              ? "manually reset"
              : "reset";
          resetStatus = `Tasks were ${resetType} ${hoursSinceReset} hour${
            hoursSinceReset !== 1 ? "s" : ""
          } ago.`;
        }
      } else if (currentTask.allow_system_reset === false) {
        // Add message if task was not auto-reset due to setting
        resetStatus = "Auto-reset is disabled for this task.";
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
    const isRequirementMet = hasCompletedTaskRequirement(
      taskKey,
      userOrders,
      getTaskRequirement
    );

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

  // Function for fetching product details
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

      return Object.entries(progressData).map(([key, completed]) => (
        <TaskItemComponent
          key={key}
          taskId={task.$id}
          taskKey={key}
          completed={completed}
          available={isTaskAvailable(key, progressData)}
          requirement={getTaskRequirement(key)}
          requirementMet={hasCompletedTaskRequirement(
            key,
            userOrders,
            getTaskRequirement
          )}
          onCompleteTask={openCompletionDialog}
          onUnlockPremium={handleUnlockPremium}
          setProductDialog={setProductDialog}
          ref={(el) => {
            if (el) {
              taskItemRefs.current.set(
                `${task.$id}-${key}`,
                el as HTMLDivElement
              );
            }
          }}
        />
      ));
    } catch (error) {
      console.error("Error rendering task items:", error);
      return <p>Error loading tasks</p>;
    }
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

      <CompletionDialog
        dialogState={completionDialog}
        onClose={closeCompletionDialog}
        onComplete={handleCompleteTask}
        productDetails={productDetails}
      />

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
        <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
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

      {/* Add CSS for highlight animation */}
      <style jsx global>{`
        .highlight-transition {
          transition: all 0.5s ease-in-out;
        }

        .highlight-task {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
          transform: scale(1.03);
          z-index: 10;
        }
      `}</style>
    </>
  );
}
