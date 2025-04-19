"use client";

import { useState, useEffect } from "react";
import {
  getEmptyTaskSettings,
  getTaskSettingsById,
  updateTaskSettings,
  createTaskSettings,
} from "@/lib/actions/task-settings.action";
import { getProducts } from "@/lib/actions/product.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { TaskSettings } from "@/lib/domains/task-settings.domain";

interface TaskItem {
  product_id: string;
  amount: string;
}

interface Product {
  $id: string;
  name: string;
}

export default function TaskSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [taskSettings, setTaskSettings] = useState<TaskSettings | null>(null);
  const [taskData, setTaskData] = useState<Record<string, TaskItem>>({});
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // Fetch products for dropdown
        const productsResult = await getProducts(100);
        if (productsResult.data) {
          setProducts(productsResult.data as unknown as Product[]);
        }

        // Try to get existing task settings
        const result = await getTaskSettingsById("task-settings"); // Using a fixed ID

        if (result.data) {
          setTaskSettings(result.data as unknown as TaskSettings);
          setTaskData(JSON.parse(result.data.settings));
        } else {
          // If no settings exist, create with empty default
          const emptySettings = await getEmptyTaskSettings();
          const createResult = await createTaskSettings({
            $id: "task-settings",
            settings: emptySettings,
          });

          if (createResult.data) {
            setTaskSettings(createResult.data as unknown as TaskSettings);
            setTaskData(JSON.parse(emptySettings));
          }
        }
      } catch (error) {
        console.error("Error loading task settings:", error);
        toast.error("Failed to load task settings");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleTaskChange = (
    taskKey: string,
    field: keyof TaskItem,
    value: string
  ) => {
    // For product_id, convert "none" back to empty string in the data
    const actualValue = field === "product_id" && value === "none" ? "" : value;

    setTaskData((prev) => ({
      ...prev,
      [taskKey]: {
        ...prev[taskKey],
        [field]: actualValue,
      },
    }));
  };

  const saveTaskSettings = async () => {
    try {
      setIsLoading(true);

      const settingsStr = JSON.stringify(taskData);

      let result;
      if (taskSettings?.$id) {
        result = await updateTaskSettings(taskSettings.$id, {
          settings: settingsStr,
        });
      } else {
        result = await createTaskSettings({
          $id: "task-settings",
          settings: settingsStr,
        });
      }

      if (result.data) {
        setTaskSettings(result.data as unknown as TaskSettings);
        toast.success("Task settings saved successfully");
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error saving task settings:", error);
      toast.error("Failed to save task settings");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !taskData) {
    return (
      <div className="flex justify-center items-center h-full">Loading...</div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Task Settings</h1>
        <Button onClick={saveTaskSettings} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 36 }, (_, i) => `task${i + 1}`).map((taskKey) => (
          <Card key={taskKey}>
            <CardHeader>
              <CardTitle>{taskKey.replace("task", "Task ")}</CardTitle>
              <CardDescription>Configure product and amount</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${taskKey}-product`}>Product</Label>
                  <Select
                    value={taskData[taskKey]?.product_id || "none"}
                    onValueChange={(value) =>
                      handleTaskChange(taskKey, "product_id", value)
                    }
                  >
                    <SelectTrigger id={`${taskKey}-product`}>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.$id} value={product.$id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${taskKey}-amount`}>Amount</Label>
                  <Input
                    id={`${taskKey}-amount`}
                    type="text"
                    value={taskData[taskKey]?.amount || ""}
                    onChange={(e) =>
                      handleTaskChange(taskKey, "amount", e.target.value)
                    }
                    placeholder="Enter amount"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
