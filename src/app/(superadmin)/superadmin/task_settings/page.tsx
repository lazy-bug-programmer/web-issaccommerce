/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  getEmptyTaskSettings,
  getTaskSettingsById,
  updateTaskSettings,
  createTaskSettings,
  getAllSuperadminTaskSettings,
  createAdditionalSuperadminTaskSettings,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TaskItem {
  product_id: string;
  amount: string;
}

interface Product {
  $id: string;
  name: string;
  price: number;
  discount_rate: number;
}

// Function to truncate product names
const truncateText = (text: string, maxLength: number = 20) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export default function TaskSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTaskSettings, setActiveTaskSettings] =
    useState<TaskSettings | null>(null);
  const [taskData, setTaskData] = useState<Record<string, TaskItem>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [allTaskSettings, setAllTaskSettings] = useState<TaskSettings[]>([]);
  const [activeTab, setActiveTab] = useState<string>("task-settings"); // Default to the default task settings
  const [newSettingsName, setNewSettingsName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Load all task settings and products
  const loadAllData = async () => {
    try {
      setIsLoading(true);

      // Fetch products for dropdown
      const productsResult = await getProducts(100);
      if (productsResult.data) {
        setProducts(productsResult.data as unknown as Product[]);
      }

      // Fetch all superadmin task settings
      const allSettingsResult = await getAllSuperadminTaskSettings();
      if (allSettingsResult.data) {
        setAllTaskSettings(allSettingsResult.data as unknown as TaskSettings[]);

        // Make sure we have a default "task-settings"
        const defaultSettings = allSettingsResult.data.find(
          (setting: any) => setting.$id === "task-settings"
        );

        if (!defaultSettings) {
          // Create default settings if not found
          const emptySettings = await getEmptyTaskSettings();
          await createTaskSettings({
            $id: "task-settings",
            name: "Default Task Settings",
            settings: emptySettings,
          });

          // Reload all settings
          const refreshResult = await getAllSuperadminTaskSettings();
          if (refreshResult.data) {
            setAllTaskSettings(refreshResult.data as unknown as TaskSettings[]);
          }
        }
      }

      // Load the active tab data
      await loadTaskSettingsData(activeTab);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  // Load specific task settings data
  const loadTaskSettingsData = async (taskSettingsId: string) => {
    try {
      setIsLoading(true);

      const result = await getTaskSettingsById(taskSettingsId);

      if (result.data) {
        setActiveTaskSettings(result.data as unknown as TaskSettings);
        setTaskData(JSON.parse(result.data.settings));
        setActiveTab(taskSettingsId);
      } else {
        toast.error("Failed to load selected task settings");
      }
    } catch (error) {
      console.error("Error loading task settings:", error);
      toast.error("Failed to load task settings");
    } finally {
      setIsLoading(false);
    }
  };

  // Create new task settings
  const handleCreateNewSettings = async () => {
    if (!newSettingsName.trim()) {
      toast.error("Please enter a name for the new settings");
      return;
    }

    try {
      setIsLoading(true);

      const result = await createAdditionalSuperadminTaskSettings(
        newSettingsName
      );

      if (result.data) {
        toast.success("New task settings created successfully");
        setNewSettingsName("");
        setCreateDialogOpen(false);

        // Reload all settings and switch to the new one
        await loadAllData();
        await loadTaskSettingsData(result.data.$id);
      } else {
        toast.error(result.error || "Failed to create new settings");
      }
    } catch (error) {
      console.error("Error creating new settings:", error);
      toast.error("Failed to create new settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
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

  // Helper to calculate discounted price
  const getDisplayPrice = (product: Product) => {
    if (!product.price) return "৳0.00";

    if (product.discount_rate) {
      const discountedPrice = product.price * (1 - product.discount_rate / 100);
      return `৳${discountedPrice.toFixed(2)} (${product.discount_rate}% off)`;
    }

    return `৳${product.price.toFixed(2)}`;
  };

  // Helper to get actual price value (for sorting)
  const getActualPrice = (product: Product) => {
    if (!product.price) return 0;
    if (product.discount_rate) {
      return product.price * (1 - product.discount_rate / 100);
    }
    return product.price;
  };

  // Sort products by price (highest to lowest)
  const sortedProducts = [...products].sort(
    (a, b) => getActualPrice(b) - getActualPrice(a)
  );

  const saveTaskSettings = async () => {
    if (!activeTaskSettings?.$id) {
      toast.error("No active task settings to save");
      return;
    }

    try {
      setIsLoading(true);

      const settingsStr = JSON.stringify(taskData);

      const result = await updateTaskSettings(activeTaskSettings.$id, {
        settings: settingsStr,
      });

      if (result.data) {
        toast.success("Task settings saved successfully");

        // Update the active task settings in the state
        setActiveTaskSettings(result.data as unknown as TaskSettings);

        // Refresh all settings
        await loadAllData();
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

  if (isLoading && !allTaskSettings.length) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-48">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <p>Loading task settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Task Settings Management</h1>

        <div className="flex gap-2">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" /> New Task Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task Settings</DialogTitle>
                <DialogDescription>
                  Enter a name for your new task settings configuration.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Name</Label>
                  <Input
                    id="name"
                    value={newSettingsName}
                    onChange={(e) => setNewSettingsName(e.target.value)}
                    className="col-span-3"
                    placeholder="E.g., Seasonal Tasks, Special Promotion"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateNewSettings}
                  disabled={!newSettingsName.trim() || isLoading}
                >
                  {isLoading ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            onClick={saveTaskSettings}
            disabled={isLoading || !activeTaskSettings}
          >
            {isLoading ? "Saving..." : "Save Current Settings"}
          </Button>
        </div>
      </div>

      {allTaskSettings.length > 0 ? (
        <Tabs
          value={activeTab}
          onValueChange={(value) => loadTaskSettingsData(value)}
        >
          <div className="mb-6">
            <TabsList className="mb-2">
              {allTaskSettings.map((setting: any) => (
                <TabsTrigger key={setting.$id} value={setting.$id}>
                  {setting.$id === "task-settings"
                    ? "Default Settings"
                    : setting.name || `Settings ${setting.$id.slice(0, 8)}`}
                  {setting.$id === "task-settings" && (
                    <span className="ml-2 text-xs bg-primary/20 px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {allTaskSettings.map((setting: any) => (
            <TabsContent key={setting.$id} value={setting.$id}>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>
                    {setting.$id === "task-settings"
                      ? "Default Task Settings"
                      : setting.name ||
                        `Task Settings ${setting.$id.slice(0, 8)}`}
                  </CardTitle>
                  <CardDescription>
                    {setting.$id === "task-settings"
                      ? "This is the default task settings configuration used by the system."
                      : "This is an additional task settings configuration."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    ID: {setting.$id}
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 36 }, (_, i) => `task${i + 1}`).map(
                  (taskKey) => (
                    <Card key={taskKey}>
                      <CardHeader>
                        <CardTitle>
                          {taskKey.replace("task", "Task ")}
                        </CardTitle>
                        <CardDescription>
                          Configure product and amount
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`${taskKey}-product`}>
                              Product
                            </Label>
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
                                {sortedProducts.map((product) => (
                                  <SelectItem
                                    key={product.$id}
                                    value={product.$id}
                                  >
                                    <div className="flex justify-between">
                                      <span
                                        className="truncate mr-2"
                                        title={product.name}
                                      >
                                        {truncateText(product.name)}
                                      </span>
                                      <span className="whitespace-nowrap">
                                        {getDisplayPrice(product)}
                                      </span>
                                    </div>
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
                                handleTaskChange(
                                  taskKey,
                                  "amount",
                                  e.target.value
                                )
                              }
                              placeholder="Enter amount"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="flex justify-center items-center h-48">
          <div className="text-center">
            <p className="mb-4">No task settings found</p>
            <Button onClick={loadAllData}>Refresh</Button>
          </div>
        </div>
      )}
    </div>
  );
}
