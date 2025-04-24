/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createAdminClient, getLoggedInUser } from "@/lib/appwrite/server";
import { Product } from "@/lib/domains/products.domain";
import { Query, ID } from "node-appwrite";

const DATABASE_ID = 'Core';
const PRODUCTS_COLLECTION_ID = 'Products';
const STORAGE_BUCKET_ID = 'Core';

// Upload image to storage
export async function uploadProductImage(file: File) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { storage } = await createAdminClient();

        // Upload file to storage
        const fileId = ID.unique();

        // Create file input for Appwrite
        await storage.createFile(
            STORAGE_BUCKET_ID,
            fileId,
            file, // Pass buffer directly
        );

        return {
            data: {
                fileId
            }
        };
    } catch (error: any) {
        console.error("Error uploading image:", error);
        return { error: error.message || "Failed to upload image" };
    }
}

// Upload multiple product images
export async function uploadProductImages(files: File[]) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { storage } = await createAdminClient();
        const fileIds: string[] = [];

        // Upload each file and collect the IDs
        for (const file of files) {
            const fileId = ID.unique();
            await storage.createFile(
                STORAGE_BUCKET_ID,
                fileId,
                file,
            );
            fileIds.push(fileId);
        }

        return {
            data: {
                fileIds
            }
        };
    } catch (error: any) {
        console.error("Error uploading images:", error);
        return { error: error.message || "Failed to upload images" };
    }
}

export async function getProductImage(id: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { storage } = await createAdminClient();

        const file = await storage.getFileDownload(STORAGE_BUCKET_ID, id);

        return {
            data: {
                file
            }
        };
    } catch (error: any) {
        console.error("Error getting image:", error);
        return { error: error.message || "Failed to get image" };
    }
}

// CREATE with image uploads
export async function createProductWithImage(product: Omit<Product, | "$id">, imageFiles?: File[]) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        let image_urls = product.image_urls || [];

        // If image files are provided, upload them first
        if (imageFiles && imageFiles.length > 0) {
            const uploadResult = await uploadProductImages(imageFiles);
            if (uploadResult.error) {
                return { error: uploadResult.error };
            }

            if (uploadResult.data) {
                image_urls = uploadResult.data.fileIds;
            }
        }

        // Create product with the image URLs
        const { databases } = await createAdminClient();

        // Remove $id if it exists in the product object
        const { $id, ...productData } = product as any;

        const newProduct = await databases.createDocument(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            "unique()",
            {
                name: product.name,
                description: product.description,
                image_urls: image_urls,
                quantity: product.quantity,
                price: product.price,
                discount_rate: product.discount_rate,
            }
        );

        return { data: newProduct };
    } catch (error: any) {
        console.error("Error creating product:", error);
        return { error: error.message || "Failed to create product" };
    }
}

// Original CREATE function (kept for backward compatibility)
export async function createProduct(product: Product) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        // Remove $id if it exists in the product object
        const { $id, ...productWithoutId } = product as any;

        // Handle potential legacy data with image_url instead of image_urls
        const imageUrls = product.image_urls || [];
        if ((product as any).image_url && !product.image_urls) {
            imageUrls.push((product as any).image_url);
        }

        const newProduct = await databases.createDocument(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            "unique()",
            {
                name: product.name,
                description: product.description,
                image_urls: imageUrls,
                quantity: product.quantity,
                price: product.price,
                discount_rate: product.discount_rate,
            }
        );

        return { data: newProduct };
    } catch (error: any) {
        console.error("Error creating product:", error);
        return { error: error.message || "Failed to create product" };
    }
}

// READ
export async function getProducts(limit = 10000, offset = 0, keyword = "") {
    try {
        const { databases } = await createClient();

        const queries = [
            Query.limit(limit),
            Query.offset(offset)
        ];

        // Add search query if keyword is provided
        if (keyword && keyword.trim()) {
            queries.push(Query.contains("name", keyword));
        }

        const products = await databases.listDocuments(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            queries
        );

        return {
            data: products.documents,
            total: products.total
        };
    } catch (error: any) {
        console.error("Error getting products:", error);
        return { error: error.message || "Failed to get products", total: 0 };
    }
}

export async function getProductById(productId: string) {
    try {
        const { databases } = await createClient();

        const product = await databases.getDocument(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            productId
        );

        return { data: product };
    } catch (error: any) {
        console.error("Error getting product:", error);
        return { error: error.message || "Failed to get product" };
    }
}

// UPDATE
export async function updateProduct(productId: string, updates: Partial<Product>) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        // Handle potential legacy data with image_url instead of image_urls
        const updatesToApply = { ...updates };

        if ((updates as any).image_url && !updates.image_urls) {
            updatesToApply.image_urls = [(updates as any).image_url];
            delete (updatesToApply as any).image_url;
        }

        const updatedProduct = await databases.updateDocument(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            productId,
            updatesToApply
        );

        return { data: updatedProduct };
    } catch (error: any) {
        console.error("Error updating product:", error);
        return { error: error.message || "Failed to update product" };
    }
}

// UPDATE with image uploads
export async function updateProductWithImages(productId: string, updates: Partial<Product>, newImageFiles?: File[], keepExistingImages = true) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        // Get current product to access existing images if needed
        const { databases } = await createAdminClient();
        const currentProduct = await databases.getDocument(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            productId
        );

        let image_urls: string[] = [];

        // Keep existing images if requested
        if (keepExistingImages && currentProduct.image_urls) {
            image_urls = [...currentProduct.image_urls];
        }

        // If product has updates for image_urls, use those
        if (updates.image_urls) {
            image_urls = keepExistingImages
                ? [...image_urls, ...updates.image_urls]
                : updates.image_urls;
        }

        // Upload new images if provided
        if (newImageFiles && newImageFiles.length > 0) {
            const uploadResult = await uploadProductImages(newImageFiles);
            if (uploadResult.error) {
                return { error: uploadResult.error };
            }

            if (uploadResult.data) {
                image_urls = [...image_urls, ...uploadResult.data.fileIds];
            }
        }

        // Prepare final updates
        const updatesToApply = {
            ...updates,
            image_urls
        };

        // Remove image_url if it exists in legacy data
        if ((updatesToApply as any).image_url) {
            delete (updatesToApply as any).image_url;
        }

        const updatedProduct = await databases.updateDocument(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            productId,
            updatesToApply
        );

        return { data: updatedProduct };
    } catch (error: any) {
        console.error("Error updating product:", error);
        return { error: error.message || "Failed to update product" };
    }
}

// DELETE
export async function deleteProduct(productId: string) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            productId
        );

        return { message: "Product deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting product:", error);
        return { error: error.message || "Failed to delete product" };
    }
}

// Admin 
export async function adminDeleteProduct(productId: string) {
    try {
        const { databases } = await createAdminClient();

        await databases.deleteDocument(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            productId
        );

        return { message: "Product deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting product:", error);
        return { error: error.message || "Failed to delete product" };
    }
}

// Helper function to create a regular client
async function createClient() {
    const { databases } = await createAdminClient();
    return { databases };
}