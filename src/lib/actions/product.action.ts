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

// CREATE with image upload
export async function createProductWithImage(product: Omit<Product, "user_id" | "$id">, imageFile?: File) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        let image_url = product.image_url;

        // If image file is provided, upload it first
        if (imageFile) {
            const uploadResult = await uploadProductImage(imageFile);
            if (uploadResult.error) {
                return { error: uploadResult.error };
            }

            if (uploadResult.data) {
                image_url = uploadResult.data.fileId;
            }
        }

        // Create product with the image URL
        const { databases } = await createAdminClient();

        const newProduct = await databases.createDocument(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            "unique()",
            {
                user_id: user.$id,
                name: product.name,
                description: product.description,
                image_url: image_url,
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
export async function createProduct(product: Omit<Product, "user_id">) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const newProduct = await databases.createDocument(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            "unique()",
            {
                user_id: user.$id,
                name: product.name,
                description: product.description,
                image_url: product.image_url,
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
export async function getProducts(limit = 10, offset = 0, keyword = "") {
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

export async function getUserProducts() {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { error: "Not authorized" };
        }

        const { databases } = await createAdminClient();

        const products = await databases.listDocuments(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            [Query.equal("user_id", user.$id)]
        );

        return { data: products.documents };
    } catch (error: any) {
        console.error("Error getting user products:", error);
        return { error: error.message || "Failed to get user products" };
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

        // First check if the product belongs to the user
        const product = await databases.getDocument(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            productId
        );

        if (product.user_id !== user.$id) {
            return { error: "Not authorized to update this product" };
        }

        const updatedProduct = await databases.updateDocument(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            productId,
            updates
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

        // First check if the product belongs to the user
        const product = await databases.getDocument(
            DATABASE_ID,
            PRODUCTS_COLLECTION_ID,
            productId
        );

        if (product.user_id !== user.$id) {
            return { error: "Not authorized to delete this product" };
        }

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