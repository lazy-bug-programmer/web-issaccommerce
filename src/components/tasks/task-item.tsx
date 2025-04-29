import { forwardRef } from "react";
import { AlertCircle, LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskItem } from "@/lib/actions/task-settings.action";

interface TaskItemProps {
  taskId: string;
  taskKey: string;
  completed: boolean;
  available: boolean;
  requirement: TaskItem | null;
  requirementMet: boolean;
  onCompleteTask: (taskId: string, taskKey: string) => void;
  onUnlockPremium: () => void;
  setProductDialog: (dialog: {
    open: boolean;
    productId: string;
    taskId: string;
    taskKey: string;
  }) => void;
}

export const TaskItemComponent = forwardRef<HTMLDivElement, TaskItemProps>(
  function TaskItemComponent(
    {
      taskId,
      taskKey,
      completed,
      available,
      requirement,
      requirementMet,
      onCompleteTask,
      onUnlockPremium,
      setProductDialog,
    },
    ref
  ) {
    const isPaywall = taskKey.startsWith("paywall");
    const requirementExists =
      requirement && requirement.product_id && requirement.product_id !== "";

    return (
      <div
        ref={ref}
        className={`p-3 rounded-md mb-2 transition-all duration-300 ${
          completed
            ? "bg-green-100 dark:bg-green-900/20"
            : !available && !isPaywall
            ? "bg-gray-100 dark:bg-gray-800"
            : requirementExists && !requirementMet
            ? "bg-amber-100 dark:bg-amber-900/20"
            : "bg-muted/30"
        } highlight-transition`}
      >
        {isPaywall ? (
          <div className="flex items-center gap-2">
            <LockIcon size={16} className="text-amber-500" />
            <div>
              <h4 className="font-semibold text-amber-500">Premium Content</h4>
              <p className="text-sm text-muted-foreground">
                Purchase to unlock the next set of tasks
              </p>
              {!completed && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 bg-amber-500/10 border-amber-500 text-amber-600"
                  onClick={onUnlockPremium}
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
                {taskKey.replace(/([A-Z])/g, " $1").trim()}{" "}
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
                    <AlertCircle size={16} className="text-amber-500 mr-1" />
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/20"
                      onClick={() =>
                        setProductDialog({
                          open: true,
                          productId: requirement.product_id,
                          taskId: taskId,
                          taskKey: taskKey,
                        })
                      }
                    >
                      Start Your Task
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onCompleteTask(taskId, taskKey)}
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
  }
);
