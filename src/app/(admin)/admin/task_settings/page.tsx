"use client";

import { useState, useEffect } from "react";
import {
  getAdminTaskSettings,
  getUserTaskSettings,
  updateTaskSettings,
  createTaskSettings,
  TaskItem,
  getAllSellersForTaskAssignment,
  getAllSuperadminTaskSettings,
  getTaskSettingsById,
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
import { CheckIcon, PlusCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Product {
  $id: string;
  name: string;
  price: number;
  discount_rate: number;
}

interface Seller {
  $id: string;
  name: string;
  email: string;
}

interface SuperadminTaskSetting {
  $id: string;
  name?: string;
  settings: string;
}

// Add truncate function near the top of the file
const truncateText = (text: string, maxLength: number = 20) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export default function TaskSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [taskSettings, setTaskSettings] = useState<TaskSettings | null>(null);
  const [taskData, setTaskData] = useState<Record<string, TaskItem>>({});
  const [adminTaskData, setAdminTaskData] = useState<Record<string, TaskItem>>(
    {}
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<string>("user");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPopoverTask, setSelectedPopoverTask] = useState<string | null>(
    null
  );
  const [superadminTaskSettings, setSuperadminTaskSettings] = useState<
    SuperadminTaskSetting[]
  >([]);
  const [selectedDefaultTaskSettings, setSelectedDefaultTaskSettings] =
    useState<string>("none");
  const [isTemplateSelected, setIsTemplateSelected] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        setIsAdmin(true);

        // Fetch products for dropdown
        const productsResult = await getProducts(100);
        if (productsResult.data) {
          setProducts(productsResult.data as unknown as Product[]);
        }

        // Fetch all superadmin task settings
        const superadminResult = await getAllSuperadminTaskSettings();
        if (superadminResult.data) {
          setSuperadminTaskSettings(
            superadminResult.data as unknown as SuperadminTaskSetting[]
          );
        }

        // Fetch all sellers if user is admin
        const sellersResult = await getAllSellersForTaskAssignment();
        if (sellersResult.data) {
          setSellers(sellersResult.data as Seller[]);
        }

        // Get admin task settings for comparison
        const adminTaskResult = await getAdminTaskSettings();
        if (adminTaskResult.data) {
          setAdminTaskData(JSON.parse(adminTaskResult.data.settings));
        }

        // Get user-specific task settings
        const userResult = await getUserTaskSettings();
        if (userResult.data) {
          const userData = userResult.data as unknown as TaskSettings;
          setTaskSettings(userData);

          // Parse settings
          const parsedSettings = JSON.parse(userData.settings);
          setTaskData(parsedSettings);

          // Check if default_task_settings_id is defined
          if (userData.default_task_settings_id) {
            setSelectedDefaultTaskSettings(userData.default_task_settings_id);
            setIsTemplateSelected(true);

            // Fetch the reference settings
            await loadReferenceSettings(userData.default_task_settings_id);
          }
        } else if (userResult.error) {
          toast.error(userResult.error);
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

  // Load reference settings
  const loadReferenceSettings = async (templateId: string) => {
    if (!templateId || templateId === "none") return;

    try {
      setIsLoading(true);

      const result = await getTaskSettingsById(templateId);
      if (result.data) {
        // Set the reference data
        setAdminTaskData(JSON.parse(result.data.settings));
        toast.success("Reference template loaded successfully");
      } else {
        toast.error("Failed to load reference template");
      }
    } catch (error) {
      console.error("Error loading reference template:", error);
      toast.error("Failed to load reference template");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle template selection
  const handleReferenceTemplateChange = async (templateId: string) => {
    setSelectedDefaultTaskSettings(templateId);

    if (templateId && templateId !== "none") {
      setIsTemplateSelected(true);
      await loadReferenceSettings(templateId);
    } else {
      setIsTemplateSelected(false);
    }
  };

  const handleTaskChange = (
    taskKey: string,
    field: keyof TaskItem,
    value: string | string[]
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

  const toggleUserAssignment = (taskKey: string, userId: string) => {
    setTaskData((prev) => {
      const currentTask = prev[taskKey] || {
        product_id: "",
        amount: "",
        user_id: [],
      };

      // Convert user_id to array if it's a string or undefined
      let currentUserIds: string[] = [];
      if (Array.isArray(currentTask.user_id)) {
        currentUserIds = currentTask.user_id;
      } else if (currentTask.user_id) {
        currentUserIds = [currentTask.user_id];
      }

      // If userId is already in the array, remove it; otherwise, add it
      const updatedUserIds = currentUserIds.includes(userId)
        ? currentUserIds.filter((id) => id !== userId)
        : [...currentUserIds, userId];

      return {
        ...prev,
        [taskKey]: {
          ...currentTask,
          user_id: updatedUserIds,
        },
      };
    });
  };

  const saveTaskSettings = async () => {
    try {
      if (selectedDefaultTaskSettings === "none") {
        toast.error("Please select a reference template first");
        return;
      }

      setIsLoading(true);

      const settingsStr = JSON.stringify(taskData);

      let result;
      if (taskSettings?.$id) {
        result = await updateTaskSettings(taskSettings.$id, {
          settings: settingsStr,
          default_task_settings_id: selectedDefaultTaskSettings,
        });
      } else {
        result = await createTaskSettings({
          settings: settingsStr,
          default_task_settings_id: selectedDefaultTaskSettings,
          name: "",
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

  // Helper to calculate discounted price
  const getDisplayPrice = (product: Product) => {
    if (!product.price) return "$0.00";

    if (product.discount_rate) {
      const discountedPrice = product.price * (1 - product.discount_rate / 100);
      return `$${discountedPrice.toFixed(2)} (${product.discount_rate}% off)`;
    }

    return `$${product.price.toFixed(2)}`;
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

  const renderTaskCards = (
    data: Record<string, TaskItem>,
    isEditable: boolean
  ) => (
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
                {isEditable ? (
                  <Select
                    value={data[taskKey]?.product_id || "none"}
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
                        <SelectItem key={product.$id} value={product.$id}>
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
                ) : (
                  <div className="border rounded p-2 bg-muted">
                    {(() => {
                      const product = products.find(
                        (p) => p.$id === data[taskKey]?.product_id
                      );
                      return product ? (
                        <div className="flex justify-between">
                          <span className="truncate mr-2" title={product.name}>
                            {truncateText(product.name)}
                          </span>
                          <span className="whitespace-nowrap">
                            {getDisplayPrice(product)}
                          </span>
                        </div>
                      ) : (
                        "None"
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${taskKey}-amount`}>Amount</Label>
                {isEditable ? (
                  <Input
                    id={`${taskKey}-amount`}
                    type="text"
                    value={data[taskKey]?.amount || ""}
                    onChange={(e) =>
                      handleTaskChange(taskKey, "amount", e.target.value)
                    }
                    placeholder="Enter amount"
                  />
                ) : (
                  <div className="border rounded p-2 bg-muted">
                    {data[taskKey]?.amount || ""}
                  </div>
                )}
              </div>

              {/* User assignment section - only show for admin */}
              {isAdmin && isEditable && (
                <div className="space-y-2">
                  <Label>Assign Users</Label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {/* Convert data[taskKey]?.user_id to array if it exists */}
                    {(() => {
                      const userIds = data[taskKey]?.user_id;
                      if (!userIds) return null;

                      // Convert to array if it's a string
                      const userIdArray = Array.isArray(userIds)
                        ? userIds
                        : [userIds];

                      return userIdArray.map((userId) => {
                        const user = sellers.find((s) => s.$id === userId);
                        return user ? (
                          <Badge
                            key={userId}
                            variant="secondary"
                            className="text-xs"
                          >
                            {user.name}
                            <button
                              className="ml-1 text-xs"
                              onClick={() =>
                                toggleUserAssignment(taskKey, userId)
                              }
                            >
                              x
                            </button>
                          </Badge>
                        ) : null;
                      });
                    })()}
                  </div>
                  <Popover
                    open={selectedPopoverTask === taskKey}
                    onOpenChange={(open) => {
                      if (open) {
                        setSelectedPopoverTask(taskKey);
                      } else {
                        setSelectedPopoverTask(null);
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <PlusCircleIcon className="mr-2 h-4 w-4" />
                        Assign Users
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search user..." />
                        <CommandEmpty>No user found.</CommandEmpty>
                        <CommandGroup>
                          {sellers.map((seller) => {
                            const isSelected = data[taskKey]?.user_id?.includes(
                              seller.$id
                            );
                            return (
                              <CommandItem
                                key={seller.$id}
                                value={seller.$id}
                                onSelect={() => {
                                  toggleUserAssignment(taskKey, seller.$id);
                                }}
                              >
                                <div
                                  className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                    isSelected
                                      ? "bg-primary text-primary-foreground"
                                      : "opacity-50"
                                  )}
                                >
                                  {isSelected && (
                                    <CheckIcon className="h-3 w-3" />
                                  )}
                                </div>
                                <span>{seller.name}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Read-only view of assigned users */}
              {(!isEditable || !isAdmin) && data[taskKey]?.user_id && (
                <div className="space-y-2">
                  <Label>Assigned Users</Label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(() => {
                      const userIds = data[taskKey]?.user_id;
                      if (!userIds) return null;

                      // Convert to array if it's a string
                      const userIdArray = Array.isArray(userIds)
                        ? userIds
                        : [userIds];

                      return userIdArray.map((userId) => {
                        const user = sellers.find((s) => s.$id === userId);
                        return user ? (
                          <Badge
                            key={userId}
                            variant="secondary"
                            className="text-xs"
                          >
                            {user.name}
                          </Badge>
                        ) : (
                          <Badge
                            key={userId}
                            variant="outline"
                            className="text-xs"
                          >
                            {userId}
                          </Badge>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Task Settings</h1>
        {activeTab === "user" && (
          <Button
            onClick={saveTaskSettings}
            disabled={isLoading || selectedDefaultTaskSettings === "none"}
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Reference Template</CardTitle>
          <CardDescription>
            Select a superadmin template to use as your reference
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reference-template">Template</Label>
              <Select
                value={selectedDefaultTaskSettings}
                onValueChange={handleReferenceTemplateChange}
              >
                <SelectTrigger id="reference-template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a template</SelectItem>
                  {superadminTaskSettings.map((setting) => (
                    <SelectItem key={setting.$id} value={setting.$id}>
                      {setting.$id === "task-settings"
                        ? "Default Template"
                        : setting.name || `Template ${setting.$id.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isTemplateSelected && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700">
                <p>
                  You must select a reference template before you can save your
                  task settings.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="user">Your Settings</TabsTrigger>
          <TabsTrigger value="admin">Reference Template</TabsTrigger>
        </TabsList>
        <TabsContent value="user">
          {renderTaskCards(taskData, true)}
        </TabsContent>
        <TabsContent value="admin">
          <div className="text-center p-4 mb-4 bg-muted rounded-lg">
            <p>
              These are the reference template settings. You cannot edit them.
            </p>
          </div>
          {isTemplateSelected ? (
            renderTaskCards(adminTaskData, false)
          ) : (
            <div className="text-center p-8 bg-muted rounded-lg">
              <p className="text-lg mb-4">
                Please select a reference template first
              </p>
              <p className="text-muted-foreground">
                You need to select a superadmin template to view reference
                settings.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
