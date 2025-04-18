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
import { LockIcon, AlertCircle } from "lucide-react";
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
import { getTaskSettingsById } from "@/lib/actions/task-settings.action";
import { getUserOrders } from "@/lib/actions/orders.action";
import { Orders } from "@/lib/domains/orders.domain";
import { TaskItem } from "@/lib/actions/task-settings.action";
import { toast } from "sonner";
import { getProductById } from "@/lib/actions/product.action";
import { Product } from "@/lib/domains/products.domain";

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

  // Function to check if task was last edited on a different day
  const isTaskResetNeeded = (task: Task) => {
    if (!task.last_edit) return false;

    const lastEdit = new Date(task.last_edit);
    const today = new Date();

    return (
      lastEdit.getDate() !== today.getDate() ||
      lastEdit.getMonth() !== today.getMonth() ||
      lastEdit.getFullYear() !== today.getFullYear()
    );
  };

  // Function to fetch product details for task requirements
  const fetchProductDetails = async (productId: string) => {
    if (loadingProducts[productId] || productDetails[productId]) {
      return;
    }

    setLoadingProducts((prev) => ({ ...prev, [productId]: true }));

    try {
      const result = await getProductById(productId);
      if (result.data) {
        setProductDetails((prev) => ({
          ...prev,
          [productId]: result.data as unknown as Product,
        }));
      }
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error);
    } finally {
      setLoadingProducts((prev) => ({ ...prev, [productId]: false }));
    }
  };

  // Function to fetch task settings
  const fetchTaskSettings = async () => {
    try {
      const result = await getTaskSettingsById("task-settings");
      if (result.data && result.data.settings) {
        const settingsData = JSON.parse(result.data.settings);
        setTaskSettings(settingsData);

        // Fetch product details for all task requirements
        (Object.values(settingsData) as TaskItem[]).forEach((task) => {
          if (task.product_id && task.product_id !== "") {
            fetchProductDetails(task.product_id);
          }
        });
      } else {
        console.error("No task settings found");
      }
    } catch (error) {
      console.error("Error fetching task settings:", error);
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

  // Function to check if user has completed a task requirement
  const hasCompletedTaskRequirement = (taskKey: string): boolean => {
    if (!taskSettings || !userOrders || !taskSettings[taskKey]) {
      return false;
    }

    const taskRequirement = taskSettings[taskKey];
    if (!taskRequirement.product_id || taskRequirement.product_id === "") {
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

  // Enhanced function to fetch tasks - now also fetches task settings and orders
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const result = await getUserTasks();
      if (result.data) {
        const taskData = result.data as unknown as Task[];

        const needsReset = taskData.some(isTaskResetNeeded);

        if (needsReset) {
          await updateTask(taskData[0].$id, { progress: taskData[0].progress });
          const refreshResult = await getUserTasks();
          if (refreshResult.data) {
            setTasks(refreshResult.data as unknown as Task[]);
            assignAnimationsToTasks(refreshResult.data as unknown as Task[]);
          }
        } else {
          setTasks(taskData);
          assignAnimationsToTasks(taskData);
        }

        if (!taskSettings) {
          await fetchTaskSettings();
        }

        if (!ordersFetched) {
          await fetchUserOrders();
        }
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

  const handleCompleteTask = async (taskId: string, taskKey: string) => {
    try {
      const task = tasks.find((t) => t.$id === taskId);
      if (!task || !task.progress) return;

      const progressData: ProgressData = JSON.parse(task.progress);

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
        await fetchTasks();

        const allCompleted = Object.values(progressData).every(
          (val) => val === true
        );
        if (allCompleted) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
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
    }

    const taskRequirements = taskSettings?.[taskKey] || null;
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
      const productName =
        productDetails[taskRequirements.product_id]?.name ||
        `Product ${taskRequirements.product_id}`;
      const amountRequired = taskRequirements.amount
        ? `${taskRequirements.amount} units of `
        : "";

      toast(
        `You need to purchase ${amountRequired}${productName} today to complete this task.`
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
        const requirement = taskSettings?.[key];
        const requirementMet = hasCompletedTaskRequirement(key);
        const requirementExists =
          requirement &&
          requirement.product_id &&
          requirement.product_id !== "";

        // Get product details if requirement exists
        let productName = "loading...";
        let amountText = "";

        if (requirementExists) {
          const product = productDetails[requirement.product_id];
          productName = product
            ? product.name
            : `Product ${requirement.product_id}`;

          if (requirement.amount && requirement.amount !== "") {
            amountText = `${requirement.amount} units of `;
          }
        }

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
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {completed
                      ? "Completed!"
                      : !available
                      ? "Complete previous tasks first"
                      : requirementExists
                      ? requirementMet
                        ? "Requirements met! Click Complete"
                        : `Purchase ${amountText}${productName} to complete`
                      : "Complete this task to continue"}
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
                          onClick={() => router.push(`/`)}
                        >
                          Buy Now
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
                  <CardTitle>Your Learning Path</CardTitle>
                  <CardDescription className="text-white/80">
                    {getProgressPercentage(task) === 100
                      ? "All tasks completed! Great job!"
                      : `${getProgressPercentage(task)}% complete`}
                  </CardDescription>
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
    </>
  );
}
