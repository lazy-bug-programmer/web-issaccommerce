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
import { Edit, Plus, Trash, Upload } from "lucide-react";
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
} from "@/lib/appwrite/actions/product.action";
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
  image_url: z.string().or(z.literal("")),
  price: z.coerce.number().positive({
    message: "Price must be a positive number",
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productImages, setProductImages] = useState<Record<string, string>>(
    {}
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [keyword, setKeyword] = useState(""); // Add keyword state for search
  const limit = 10;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      image_url: "",
      price: 0,
      quantity: 0,
      discount_rate: 0,
    },
  });

  useEffect(() => {
    fetchProducts();
  }, [page]); // Don't add keyword here; we'll let the search button trigger fetch

  // Load images when products change
  useEffect(() => {
    products.forEach((product) => {
      if (
        product.image_url &&
        !product.image_url.startsWith("http") &&
        !productImages[product.image_url]
      ) {
        fetchProductImage(product.image_url);
      }
    });
  }, [products]);

  async function fetchProductImage(imageId: string) {
    try {
      const response = await getProductImage(imageId);
      if (response.error) {
        console.error("Error loading image:", response.error);
        return;
      }

      if (response.data?.file) {
        // Convert blob to object URL
        const blob = new Blob([response.data.file]);
        const url = URL.createObjectURL(blob);

        setProductImages((prev) => ({
          ...prev,
          [imageId]: url,
        }));
      }
    } catch (error) {
      console.error("Failed to load image:", error);
    }
  }

  async function fetchProducts() {
    setIsLoading(true);
    try {
      // Use offset pagination
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

        // Use the total from the response for pagination
        setTotalPages(Math.ceil((response.total || 0) / limit));
      }
    } catch {
      toast.error("Failed to fetch products");
    } finally {
      setIsLoading(false);
    }
  }

  // Add search handler
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
    fetchProducts();
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);

      if (isEditing && currentProduct) {
        // Update existing product
        const updatedValues = { ...values };

        // If there's no new image file, keep the existing image URL
        if (!imageFile && currentProduct.image_url) {
          updatedValues.image_url = currentProduct.image_url;
        }

        const response = await updateProduct(currentProduct.$id, updatedValues);
        if (response.error) {
          toast.error(response.error);
          return;
        }
        toast.success("Product updated successfully");
      } else {
        // Add new product with image
        if (imageFile) {
          // Since we removed the image URL field, set it to empty
          const newValues = { ...values, image_url: "" };
          const response = await createProductWithImage(newValues, imageFile);
          if (response.error) {
            toast.error(response.error);
            return;
          }
          toast.success("Product added successfully");
        } else {
          // Show error if no image was uploaded
          toast.error("Please upload a product image");
          return;
        }
      }

      // Refresh the products list
      fetchProducts();

      // Close form and reset state
      setOpen(false);
      form.reset();
      setIsEditing(false);
      setCurrentProduct(null);
      setImagePreview(null);
      setImageFile(null);
    } catch {
      toast.error("An error occurred while saving the product");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(product: Product) {
    setIsEditing(true);
    setCurrentProduct(product);
    form.reset({
      name: product.name,
      description: product.description,
      image_url: product.image_url,
      price: product.price,
      quantity: product.quantity,
      discount_rate: product.discount_rate,
    });

    // Set image preview based on source
    if (product.image_url.startsWith("http")) {
      setImagePreview(product.image_url);
    } else if (productImages[product.image_url]) {
      setImagePreview(productImages[product.image_url]);
    }

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
      image_url: "",
      price: 0,
      quantity: 0,
      discount_rate: 0,
    });
    setImagePreview(null);
    setImageFile(null);
    setOpen(true);
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Calculate final price after discount
  const calculateFinalPrice = (price: number, discountRate: number): string => {
    const finalPrice = price * (1 - discountRate / 100);
    return finalPrice.toFixed(2);
  };

  // Function to get the correct image source
  const getImageSource = (product: Product) => {
    // If it's a URL, use it directly
    if (product.image_url.startsWith("http")) {
      return product.image_url;
    }

    // If we have the image in our cache, use it
    if (productImages[product.image_url]) {
      return productImages[product.image_url];
    }

    // Otherwise use placeholder
    return "/100x100.svg";
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Products
        </h2>
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

                {/* Image Upload Section */}
                <div className="space-y-3">
                  <FormLabel>Product Image</FormLabel>

                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="w-full flex justify-center mb-3">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-40 w-40 object-cover rounded-md border"
                      />
                    </div>
                  )}

                  {/* Image Upload Button */}
                  <div className="flex items-center">
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium bg-white hover:bg-gray-50 w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {imagePreview ? "Change Image" : "Upload Image"}
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
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
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="29.99"
                            {...field}
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
      </div>

      {/* Add search bar */}
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
                  <TableHead className="w-[80px]">Image</TableHead>
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
                      <TableCell>
                        <img
                          src={getImageSource(product)}
                          alt={product.name}
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate">
                        {product.description}
                      </TableCell>
                      <TableCell className="text-right">
                        ${product.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.discount_rate}%
                      </TableCell>
                      <TableCell className="text-right">
                        $
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
