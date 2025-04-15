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
import { LockIcon } from "lucide-react";
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
  }>({ open: false, taskId: "", taskKey: "" });

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

  // Function to fetch tasks - extracted to be reusable
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const result = await getUserTasks();
      if (result.data) {
        const taskData = result.data as unknown as Task[];
        setTasks(taskData);
        assignAnimationsToTasks(taskData);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // For confetti dimensions
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
      // Get the current task
      const task = tasks.find((t) => t.$id === taskId);
      if (!task || !task.progress) return;

      // Parse the progress JSON
      const progressData: ProgressData = JSON.parse(task.progress);

      // Update the specific task to completed
      progressData[taskKey] = true;

      // Immediately create a new local version of the tasks with the updated progress
      const updatedTasks = tasks.map((t) => {
        if (t.$id === taskId) {
          return { ...t, progress: JSON.stringify(progressData) };
        }
        return t;
      });

      // Update state immediately before API call to improve UI responsiveness
      setTasks([...updatedTasks]);

      // Save the updated progress
      const result = await updateTask(taskId, {
        progress: JSON.stringify(progressData),
      });

      if (result.data) {
        // Refresh tasks from server after API call completes
        await fetchTasks();

        // Show confetti if all tasks are completed
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
    // Redirect to the contact page
    router.push("/contact");
  };

  const openCompletionDialog = (taskId: string, taskKey: string) => {
    // Get the animation for this task
    const animation =
      taskAnimationsRef.current.get(`${taskId}-${taskKey}`) ||
      getRandomAnimation();

    // Start animation
    setActiveAnimation({
      component: animation,
      visible: true,
    });

    // Clear any existing timers
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }
    if (dialogTimerRef.current) {
      clearTimeout(dialogTimerRef.current);
    }

    // After 5 seconds, stop the animation and show the dialog
    animationTimerRef.current = setTimeout(() => {
      setActiveAnimation((prev) => ({ ...prev, visible: false }));

      // Open the dialog
      setCompletionDialog({
        open: true,
        taskId,
        taskKey,
      });

      animationTimerRef.current = null;
    }, 5000);
  };

  const closeCompletionDialog = () => {
    setCompletionDialog({
      open: false,
      taskId: "",
      taskKey: "",
    });

    // Also ensure animation is stopped
    setActiveAnimation({
      component: null,
      visible: false,
    });

    // Clear timers
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    if (dialogTimerRef.current) {
      clearTimeout(dialogTimerRef.current);
      dialogTimerRef.current = null;
    }

    // Force refresh the task list to update availability
    setTasks([...tasks]);
  };

  // Cleanup timers on unmount
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
    // If this is a paywall itself, it's always available
    if (taskKey.startsWith("paywall")) return true;

    const taskKeys = Object.keys(progressData).filter(
      (k) => !k.startsWith("paywall")
    );
    const paywallKeys = Object.keys(progressData).filter((k) =>
      k.startsWith("paywall")
    );

    // For regular tasks
    if (!taskKey.startsWith("paywall")) {
      // Extract task number if possible
      const taskMatch = taskKey.match(/task(\d+)/);
      if (taskMatch) {
        const currentTaskNum = parseInt(taskMatch[1]);

        // First task is always available
        if (currentTaskNum === 1) return true;

        // Check if previous task is completed
        const prevTaskKey = `task${currentTaskNum - 1}`;

        // If previous task exists and is completed, this task is available
        if (progressData[prevTaskKey] === true) return true;

        // Otherwise check the standard way
      }
    }

    // If we couldn't determine availability by task number, fall back to position-based logic
    const currentIndex = taskKeys.indexOf(taskKey);

    // First task is always available
    if (currentIndex === 0) return true;

    // For task2 and beyond, check if the previous task is completed
    if (currentIndex > 0) {
      const previousTask = taskKeys[currentIndex - 1];
      const previousTaskCompleted = progressData[previousTask] === true;

      // If previous task is not completed, this task is not available
      if (!previousTaskCompleted) return false;
    }

    // Check if any paywall is blocking this task
    // Find all paywalls that should be completed before this task
    const requiredPaywalls = paywallKeys.filter((paywallKey) => {
      // Extract the index number from the paywall key (if it exists)
      const paywallMatch = paywallKey.match(/paywall(\d+)/);
      const taskMatch = taskKey.match(/task(\d+)/);

      if (paywallMatch && taskMatch) {
        const paywallIndex = parseInt(paywallMatch[1]);
        const taskIndex = parseInt(taskMatch[1]);
        // The paywall blocks this task if its index is lower than the task index
        return paywallIndex < taskIndex;
      }

      // If we can't determine indexes, use the basic approach:
      // A task after any paywall in the list requires that paywall to be completed
      const paywallPosition = Object.keys(progressData).indexOf(paywallKey);
      const taskPosition = Object.keys(progressData).indexOf(taskKey);
      return paywallPosition < taskPosition;
    });

    // All required paywalls must be completed
    const allRequiredPaywallsCompleted =
      requiredPaywalls.length === 0 ||
      requiredPaywalls.every((paywall) => progressData[paywall] === true);

    // Task is available if previous task is completed AND all required paywalls are completed
    return allRequiredPaywallsCompleted;
  };

  const renderTaskItems = (task: Task) => {
    try {
      if (!task.progress) return null;

      const progressData: ProgressData = JSON.parse(task.progress);

      // If animations haven't been assigned to these tasks yet, do it now
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

        return (
          <div
            key={key}
            className={`p-3 rounded-md mb-2 transition-all duration-300 ${
              completed
                ? "bg-green-100 dark:bg-green-900/20"
                : !available && !isPaywall
                ? "bg-gray-100 dark:bg-gray-800"
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
                      : "Complete this task to continue"}
                  </p>
                </div>
                {!completed && available && (
                  <Button
                    size="sm"
                    onClick={() => openCompletionDialog(task.$id, key)}
                    className="ml-2 bg-gradient-to-r from-green-400 to-emerald-600 hover:from-green-500 hover:to-emerald-700 shadow-sm"
                  >
                    Complete
                  </Button>
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

      {/* Semi-transparent overlay when animation is active */}
      {activeAnimation.visible && (
        <div className="fixed inset-0 bg-gray-900/70 z-[90]" />
      )}

      {/* Animation outside of dialog with z-index 100 */}
      {activeAnimation.visible && activeAnimation.component && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <activeAnimation.component />

          {/* Morphing text animation instead of card */}
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
                confirm and continue unlock next task.
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 flex items-center justify-center">
              <div className="bg-white/90 dark:bg-black/90 p-5 rounded-lg text-center shadow-lg border border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold mb-2">
                  Great job on completing this step!
                </h3>
                <p className="text-sm mb-4">Continue to unlock more task.</p>
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
