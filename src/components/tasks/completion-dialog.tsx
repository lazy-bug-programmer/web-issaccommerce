import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Product } from "@/lib/domains/products.domain";
import { TaskItem } from "@/lib/actions/task-settings.action";

interface CompletionDialogProps {
  dialogState: {
    open: boolean;
    taskId: string;
    taskKey: string;
    resetStatus?: string;
    taskRequirements?: TaskItem | null;
    isRequirementMet: boolean;
  };
  onClose: () => void;
  onComplete: (taskId: string, taskKey: string) => void;
  productDetails: Record<string, Product | null>;
}

export function CompletionDialog({
  dialogState,
  onClose,
  onComplete,
  productDetails,
}: CompletionDialogProps) {
  return (
    <Dialog open={dialogState.open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md backdrop-blur-sm bg-white/90 dark:bg-gray-950/90 border-2 border-primary shadow-2xl z-50">
        <div className="relative z-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Congratulations!
            </DialogTitle>
            <DialogDescription>
              You&apos;ve completed your task! Click the button below to confirm
              and continue to unlock the next task.
            </DialogDescription>
          </DialogHeader>

          <div className="py-8 flex items-center justify-center">
            <div className="bg-white/90 dark:bg-black/90 p-5 rounded-lg text-center shadow-lg border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold mb-2">
                Great job on completing this step!
              </h3>
              <p className="text-sm mb-4">Continue to unlock more tasks.</p>
              {dialogState.resetStatus && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 mb-3">
                  {dialogState.resetStatus}
                </p>
              )}
              {dialogState.taskRequirements?.product_id &&
                dialogState.isRequirementMet && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2 mb-3">
                    {`Required purchase: ${
                      dialogState.taskRequirements.amount
                        ? `${dialogState.taskRequirements.amount} × `
                        : ""
                    }${
                      productDetails[dialogState.taskRequirements.product_id]
                        ?.name ||
                      `Product ${dialogState.taskRequirements.product_id}`
                    }`}
                  </p>
                )}
              <div className="w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600 mt-2"></div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                onComplete(dialogState.taskId, dialogState.taskKey);
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
  );
}
