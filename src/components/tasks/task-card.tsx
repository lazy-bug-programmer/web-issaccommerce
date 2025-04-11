"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getUserTasks } from "@/lib/appwrite/actions/task.action";
import { Task } from "@/lib/domains/task.domain";
import { LockIcon } from "lucide-react";
import { useRouter } from "next/navigation";

// Types for the progress JSON structure
interface ProgressData {
  [key: string]: boolean;
}

export default function TaskCard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchTasks() {
      const result = await getUserTasks();
      if (result.data) {
        const taskData = result.data as unknown as Task[];
        setTasks(taskData);
      }
      setLoading(false);
    }

    fetchTasks();
  }, []);

  const handleCompleteTask = async () => {
    try {
      // Skip updating the task
      // Just redirect to the task page
      router.push("/task");
    } catch (error) {
      console.error("Error redirecting:", error);
    }
  };

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
    const currentIndex = taskKeys.indexOf(taskKey);

    // First task is always available
    if (currentIndex === 0) return true;

    // Check if the previous task is completed
    const previousTaskCompleted =
      currentIndex > 0 && progressData[taskKeys[currentIndex - 1]] === true;

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
    return previousTaskCompleted && allRequiredPaywallsCompleted;
  };

  const renderTaskItems = (task: Task) => {
    try {
      if (!task.progress) return null;

      const progressData: ProgressData = JSON.parse(task.progress);

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
                    onClick={() => handleCompleteTask()}
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
      <Card className="w-full max-w-2xl mx-auto mb-8 animate-pulse">
        <CardHeader className="bg-muted h-20"></CardHeader>
        <CardContent className="h-40"></CardContent>
      </Card>
    );
  }

  if (!tasks.length) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Redesigned points display card */}
      <div className="mb-8">
        <Card className="w-full border-2 border-primary/50 shadow-lg overflow-visible">
          <div className="flex items-center">
            {/* Points information */}
            <div className="flex-1 p-4">
              <h3 className="text-lg font-semibold mb-2">Your Points</h3>
              <p className="text-sm text-muted-foreground">
                Complete tasks to earn more points
              </p>
            </div>

            {/* Points display with circular indicator */}
            <div className="p-6 pr-8">
              <div className="relative">
                <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 shadow-lg">
                  <div className="text-center">
                    <span className="text-3xl font-bold text-white">
                      {tasks[0]?.point || 0}
                    </span>
                    <span className="text-xs text-white/90 block">points</span>
                  </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-pink-500 opacity-70"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-blue-400 opacity-70"></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

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
                  <CardTitle>Your Task Path</CardTitle>
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
    </div>
  );
}
