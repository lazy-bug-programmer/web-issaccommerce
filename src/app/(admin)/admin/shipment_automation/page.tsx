"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Plus, Trash } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createShipmentAutomation,
  deleteShipmentAutomation,
  getShipmentAutomations,
  updateShipmentAutomation,
} from "@/lib/appwrite/actions/shipment-automations.action";
import {
  AutomationRule,
  ShipmentAutomation,
} from "@/lib/domains/shipment-automations.domain";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Validation schema for a single automation rule
const automationRuleSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  after_hour: z.coerce
    .number()
    .min(0, { message: "Hours must be non-negative" }),
});

// Validation schema for the entire form
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  rules: z
    .array(automationRuleSchema)
    .min(1, { message: "At least one rule is required" }),
});

export default function ShipmentAutomationPage() {
  const [automations, setAutomations] = useState<
    (ShipmentAutomation & { $id: string })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAutomation, setCurrentAutomation] = useState<
    (ShipmentAutomation & { $id: string }) | null
  >(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [automationToDelete, setAutomationToDelete] = useState<string | null>(
    null
  );
  const limit = 10;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      rules: [{ name: "", after_hour: 0 }],
    },
  });

  // Use the useFieldArray to handle dynamic fields
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rules",
  });

  useEffect(() => {
    fetchAutomations();
  }, [page]);

  async function fetchAutomations() {
    setIsLoading(true);
    try {
      const response = await getShipmentAutomations(limit);
      if (response.error) {
        toast.error(response.error);
        return;
      }

      if (response.data) {
        const automationData =
          response.data as unknown as (ShipmentAutomation & {
            $id: string;
          })[];
        setAutomations(automationData);
        setTotalPages(Math.ceil(automationData.length / limit));
      }
    } catch {
      toast.error("Failed to fetch automations");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);

      // Convert rules array to JSON string to store in progress field
      const progressJson = JSON.stringify(values.rules);

      if (isEditing && currentAutomation) {
        // Update existing automation
        const response = await updateShipmentAutomation(currentAutomation.$id, {
          progress: progressJson,
          name: values.name,
        });
        if (response.error) {
          toast.error(response.error);
          return;
        }
        toast.success("Automation updated successfully");
      } else {
        // Create new automation
        const response = await createShipmentAutomation({
          progress: progressJson,
          name: values.name,
        });
        if (response.error) {
          toast.error(response.error);
          return;
        }
        toast.success("Automation added successfully");
      }

      // Refresh the automations list
      fetchAutomations();

      // Close form and reset state
      setOpen(false);
      form.reset({ name: "", rules: [{ name: "", after_hour: 0 }] });
      setIsEditing(false);
      setCurrentAutomation(null);
    } catch {
      toast.error("An error occurred while saving the automation");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(automation: ShipmentAutomation & { $id: string }) {
    setIsEditing(true);
    setCurrentAutomation(automation);

    try {
      // Parse the JSON string from progress field
      const rules = JSON.parse(automation.progress) as AutomationRule[];
      // Reset form with the name and parsed rules
      form.reset({
        name: automation.name,
        rules,
      });
    } catch (error) {
      // If parsing fails, set default values
      form.reset({
        name: automation.name,
        rules: [{ name: "", after_hour: 0 }],
      });
      console.error("Error parsing automation rules:", error);
    }

    setOpen(true);
  }

  function handleDelete(id: string) {
    setAutomationToDelete(id);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!automationToDelete) return;

    try {
      const response = await deleteShipmentAutomation(automationToDelete);
      if (response.error) {
        toast.error(response.error);
        return;
      }
      toast.success("Automation deleted successfully");
      fetchAutomations();
    } catch {
      toast.error("Failed to delete automation");
    } finally {
      setDeleteDialogOpen(false);
      setAutomationToDelete(null);
    }
  }

  function handleAddNew() {
    setIsEditing(false);
    setCurrentAutomation(null);
    form.reset({ name: "", rules: [{ name: "", after_hour: 0 }] });
    setOpen(true);
  }

  // Helper function to parse and format rules for display
  function formatRules(progressJson: string): React.ReactNode {
    try {
      const rules = JSON.parse(progressJson) as AutomationRule[];
      return (
        <div className="space-y-1">
          {rules.map((rule, index) => (
            <div key={index} className="text-sm">
              <span className="font-medium">{rule.name}</span>:{" "}
              {rule.after_hour} hours
            </div>
          ))}
        </div>
      );
    } catch {
      return <span className="text-red-500">Invalid format</span>;
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Shipment Automations
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edit Automation" : "Add Automation"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Edit the automation rules below"
                  : "Add shipment status update rules based on time intervals"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Automation Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Standard Shipping Process"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-end gap-4 p-4 border rounded-md relative"
                    >
                      <FormField
                        control={form.control}
                        name={`rules.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Status Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Shipped, In Transit"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`rules.${index}.after_hour`}
                        render={({ field }) => (
                          <FormItem className="w-[120px]">
                            <FormLabel>After Hours</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="24"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="self-center"
                          onClick={() => remove(index)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ name: "", after_hour: 0 })}
                >
                  Add Rule
                </Button>

                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? "Saving..."
                      : isEditing
                      ? "Save changes"
                      : "Add automation"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading automations...</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rules</TableHead>
                  <TableHead className="text-right w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      No automations found. Add your first shipment automation
                      rule!
                    </TableCell>
                  </TableRow>
                ) : (
                  automations.map((automation) => (
                    <TableRow key={automation.$id}>
                      <TableCell>{automation.name}</TableCell>
                      <TableCell>{formatRules(automation.progress)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(automation)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(automation.$id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  {page > 1 ? (
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    />
                  ) : (
                    <PaginationPrevious className="pointer-events-none opacity-50" />
                  )}
                </PaginationItem>
                <PaginationItem>
                  Page {page} of {totalPages}
                </PaginationItem>
                <PaginationItem>
                  {page < totalPages ? (
                    <PaginationNext
                      onClick={() =>
                        setPage((p) => Math.min(p + 1, totalPages))
                      }
                    />
                  ) : (
                    <PaginationNext className="pointer-events-none opacity-50" />
                  )}
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              automation and remove the data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
