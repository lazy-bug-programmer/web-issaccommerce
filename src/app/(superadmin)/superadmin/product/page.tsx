/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, ChangeEvent } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Plus, Trash, Upload, FileSpreadsheet } from "lucide-react";
import { useForm } from "react-hook-form";
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
  createProductWithImage,
  deleteProduct,
  getProductImage,
  getProducts,
  updateProduct,
  updateProductWithImages,
} from "@/lib/actions/product.action";
import { Product } from "@/lib/domains/products.domain";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters",
  }),
  image_urls: z.array(z.string()),
  price: z.coerce.number().min(0.01, {
    message: "Price must be greater than 0",
  }),
  quantity: z.coerce.number().int().nonnegative({
    message: "Quantity must be a non-negative integer",
  }),
  discount_rate: z.coerce
    .number()
    .min(0, {
      message: "Discount rate must be at least 0%",
    })
    .max(100, {
      message: "Discount rate cannot exceed 100%",
    }),
});

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0); // New state to track total products
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productImages, setProductImages] = useState<Record<string, string>>(
    {}
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const limit = 10;
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      image_urls: [],
      price: 0,
      quantity: 0,
      discount_rate: 0,
    },
  });

  useEffect(() => {
    fetchProducts();
  }, [page]);

  async function fetchProducts() {
    setIsLoading(true);
    try {
      const offset = (page - 1) * limit;
      const response = await getProducts(limit, offset, keyword);

      if (response.error) {
        toast.error(response.error);
        return;
      }

      if (response.data) {
        const productData = response.data.map(
          (doc) => doc as unknown as Product
        );
        setProducts(productData);
        setTotalPages(Math.ceil((response.total || 0) / limit));
        setTotalProducts(response.total || 0); // Store the total count
      }
    } catch {
      toast.error("Failed to fetch products");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);

      if (isEditing && currentProduct) {
        const updatedValues = { ...values };

        const currentImageUrls: string[] = [];

        if (imagePreview.length > 0) {
          imagePreview.forEach((preview, index) => {
            if (
              index < (currentProduct.image_urls?.length || 0) &&
              preview === productImages[currentProduct.image_urls[index]]
            ) {
              currentImageUrls.push(currentProduct.image_urls[index]);
            }
          });
        }

        if (imageFiles.length > 0) {
          const response = await updateProductWithImages(
            currentProduct.$id,
            {
              ...updatedValues,
              image_urls: currentImageUrls,
            },
            imageFiles,
            false
          );

          if (response.error) {
            toast.error(response.error);
            return;
          }
        } else {
          const response = await updateProduct(currentProduct.$id, {
            ...updatedValues,
            image_urls: currentImageUrls,
          });

          if (response.error) {
            toast.error(response.error);
            return;
          }
        }

        toast.success("Product updated successfully");
      } else {
        if (imageFiles.length > 0) {
          const productData = { ...values };
          const response = await createProductWithImage(
            productData,
            imageFiles
          );
          if (response.error) {
            toast.error(response.error);
            return;
          }
          toast.success("Product added successfully");
        } else {
          toast.error("Please upload at least one product image");
          return;
        }
      }

      fetchProducts();
      setOpen(false);
      form.reset();
      setIsEditing(false);
      setCurrentProduct(null);
      setImagePreview([]);
      setImageFiles([]);
    } catch {
      toast.error("An error occurred while saving the product");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEdit(product: Product) {
    setIsEditing(true);
    setCurrentProduct(product);
    form.reset({
      name: product.name,
      description: product.description,
      image_urls: product.image_urls || [],
      price: product.price,
      quantity: product.quantity,
      discount_rate: product.discount_rate,
    });

    // Clear previous previews
    setImagePreview([]);

    if (product.image_urls && product.image_urls.length > 0) {
      // Create an array to hold all image preview promises
      const imagePromises = product.image_urls.map(async (url) => {
        if (url.startsWith("http")) {
          return url;
        } else {
          // Check if we already have this image in cache
          if (!productImages[url]) {
            try {
              const response = await getProductImage(url);
              if (response.error) {
                console.error("Error loading image:", response.error);
                return null;
              }

              if (response.data?.file) {
                const blob = new Blob([response.data.file]);
                const imageUrl = URL.createObjectURL(blob);

                // Update the product images cache
                setProductImages((prev) => ({
                  ...prev,
                  [url]: imageUrl,
                }));

                return imageUrl;
              }
              return null;
            } catch (error) {
              console.error("Failed to load image:", error);
              return null;
            }
          } else {
            // Use cached image
            return productImages[url];
          }
        }
      });

      // Wait for all image promises to resolve
      const resolvedImages = await Promise.all(imagePromises);

      // Filter out null values (failed image loads)
      const validImages = resolvedImages.filter(
        (url) => url !== null
      ) as string[];

      // Set the image previews
      setImagePreview(validImages);
    }

    // Open the dialog
    setOpen(true);
  }

  function handleDelete(id: string) {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!productToDelete) return;

    try {
      const response = await deleteProduct(productToDelete);
      if (response.error) {
        toast.error(response.error);
        return;
      }
      toast.success("Product deleted successfully");
      fetchProducts();
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  }

  function handleAddNew() {
    setIsEditing(false);
    setCurrentProduct(null);
    form.reset({
      name: "",
      description: "",
      image_urls: [],
      price: 0,
      quantity: 0,
      discount_rate: 0,
    });
    setImagePreview([]);
    setImageFiles([]);
    setOpen(true);
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [...imagePreview];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`File "${file.name}" is not an image`);
        return;
      }

      newFiles.push(file);

      const reader = new FileReader();
      reader.onload = () => {
        newPreviews.push(reader.result as string);
        setImagePreview([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });

    setImageFiles([...imageFiles, ...newFiles]);
  }

  function removeImage(index: number) {
    const newPreviews = [...imagePreview];
    newPreviews.splice(index, 1);
    setImagePreview(newPreviews);

    if (
      isEditing &&
      currentProduct &&
      index < (currentProduct.image_urls?.length || 0)
    ) {
      // No need to modify form.image_urls here as we'll rebuild it during submit
    } else {
      const newIndex =
        isEditing && currentProduct
          ? index - (currentProduct.image_urls?.length || 0)
          : index;
      if (newIndex >= 0) {
        const newFiles = [...imageFiles];
        newFiles.splice(newIndex, 1);
        setImageFiles(newFiles);
      }
    }
  }

  const calculateFinalPrice = (price: number, discountRate: number): string => {
    const finalPrice = price * (1 - discountRate / 100);
    return finalPrice.toFixed(2);
  };

  // Function to handle CSV file selection
  function handleCsvFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setCsvFile(null);
      return;
    }

    const file = files[0];
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setCsvError("Please upload a valid CSV file");
      setCsvFile(null);
      return;
    }

    setCsvError(null);
    setCsvFile(file);
  }

  // Function to parse CSV data
  async function parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split("\n");
          const headers = lines[0]
            .split(",")
            .map((header) => header.trim())
            .filter(Boolean);

          // Validate required headers
          const requiredHeaders = [
            "name",
            "description",
            "quantity",
            "price",
            "discount_rate",
          ];
          const missingHeaders = requiredHeaders.filter(
            (header) => !headers.includes(header)
          );

          if (missingHeaders.length > 0) {
            reject(`Missing required headers: ${missingHeaders.join(", ")}`);
            return;
          }

          const results = [];

          // Parse data rows
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines

            // Split by comma and remove any trailing empty values
            const rawValues = line.split(",");
            const values = rawValues.slice(0, headers.length);

            // Ensure we have all required values
            if (values.length < headers.length) {
              console.warn(`Skipping row ${i + 1}: insufficient columns`);
              continue;
            }

            const row: Record<string, any> = {};
            headers.forEach((header, index) => {
              const value = values[index].trim();
              if (
                header === "quantity" ||
                header === "price" ||
                header === "discount_rate"
              ) {
                row[header] = parseFloat(value) || 0; // Default to 0 if parsing fails
              } else {
                row[header] = value;
              }
            });

            // Validate the row has required fields with valid values
            if (!row.name || !row.description) {
              console.warn(
                `Skipping row ${i + 1}: missing name or description`
              );
              continue;
            }

            results.push(row);
          }

          if (results.length === 0) {
            reject(
              "No valid product data found in CSV. Please check your file format."
            );
          } else {
            resolve(results);
          }
        } catch (error) {
          console.error("CSV parsing error:", error);
          reject("Failed to parse CSV file. Please check the format.");
        }
      };

      reader.onerror = () => reject("Error reading the file");
      reader.readAsText(file);
    });
  }

  // Function to handle CSV upload and product creation
  async function handleCsvUpload() {
    if (!csvFile) {
      setCsvError("Please select a CSV file first");
      return;
    }

    try {
      setIsUploadingCsv(true);
      setCsvError(null);

      // Parse the CSV file
      const products = await parseCSV(csvFile);

      if (products.length === 0) {
        setCsvError("No valid product data found in CSV");
        setIsUploadingCsv(false);
        return;
      }

      // Create products one by one
      let successCount = 0;
      let errorCount = 0;

      for (const productData of products) {
        try {
          // Create product without image
          const response = await createProductWithImage(
            {
              name: productData.name,
              description: productData.description,
              image_urls: [],
              quantity: productData.quantity,
              price: productData.price,
              discount_rate: productData.discount_rate,
            },
            []
          );

          if (response.error) {
            errorCount++;
            console.error(
              `Error creating product: ${productData.name}`,
              response.error
            );
          } else {
            successCount++;
          }
        } catch (error) {
          errorCount++;
          console.error(`Error creating product: ${productData.name}`, error);
        }
      }

      // Refresh the product list
      await fetchProducts();

      // Show results
      if (errorCount === 0) {
        toast.success(`Successfully imported ${successCount} products`);
      } else {
        toast.info(
          `Imported ${successCount} products with ${errorCount} errors`
        );
      }

      // Close the dialog
      setCsvDialogOpen(false);
      setCsvFile(null);
    } catch (error: any) {
      setCsvError(error.message || "Failed to process CSV file");
    } finally {
      setIsUploadingCsv(false);
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Products
          </h2>
          {!isLoading && (
            <p className="text-muted-foreground mt-1">
              Total products in database: {totalProducts}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? "Edit Product" : "Add Product"}
                </DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? "Edit the product details below"
                    : "Add a new product to your store"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Product name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Product description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <FormLabel>Product Images</FormLabel>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {imagePreview.map((src, index) => (
                        <div key={index} className="relative">
                          <img
                            src={src}
                            alt={`Preview ${index + 1}`}
                            className="h-20 w-20 object-cover rounded-md border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={() => removeImage(index)}
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center">
                      <label
                        htmlFor="image-upload"
                        className="cursor-pointer flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium bg-white hover:bg-gray-50 w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Images
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                          multiple
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (৳)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="29.99"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === "" ? "" : parseFloat(value)
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="100" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="discount_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting
                        ? "Saving..."
                        : isEditing
                        ? "Save changes"
                        : "Add product"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Import Products from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with product data. The CSV must include
                  headers for name, description, quantity, price, and
                  discount_rate.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    CSV File
                  </label>
                  <div className="flex items-center">
                    <label
                      htmlFor="csv-upload"
                      className="cursor-pointer flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium bg-white hover:bg-gray-50 w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {csvFile ? csvFile.name : "Choose CSV File"}
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleCsvFileChange}
                      />
                    </label>
                  </div>
                  {csvError && (
                    <p className="text-sm text-destructive mt-2">{csvError}</p>
                  )}
                </div>

                <div className="bg-muted p-3 rounded-md text-sm">
                  <p className="font-medium mb-1">CSV Format:</p>
                  <p>name,description,quantity,price,discount_rate</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Example: Laptop,A powerful laptop,10,999.99,5
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCsvDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCsvUpload}
                  disabled={!csvFile || isUploadingCsv}
                >
                  {isUploadingCsv ? "Uploading..." : "Upload & Create Products"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <form
          onSubmit={handleSearch}
          className="flex w-full max-w-sm items-center space-x-2"
        >
          <Input
            type="search"
            placeholder="Search products..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Button type="submit">Search</Button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading products...</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Final Price</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No products found. Add your first product!
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.$id}>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate">
                        {product.description}
                      </TableCell>
                      <TableCell className="text-right">
                        ৳{product.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.discount_rate}%
                      </TableCell>
                      <TableCell className="text-right">
                        ৳
                        {calculateFinalPrice(
                          product.price,
                          product.discount_rate
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(product.$id)}
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
              product and remove the data from our servers.
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
