import { Product } from "@/lib/domains/products.domain";
import { getProductById, getProductImage } from "@/lib/actions/product.action";

// Cache structure with expiration
interface CacheItem<T> {
    data: T;
    expiry: number;
}

// Cache configuration
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const IMAGE_CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes for images

// In-memory cache for products
class ProductCache {
    private cache: Map<string, CacheItem<Product>> = new Map();
    private imageCache: Map<string, CacheItem<string>> = new Map();
    private fetchPromises: Map<string, Promise<Product | null>> = new Map();

    get(id: string): Product | null {
        const item = this.cache.get(id);

        // Return null if item doesn't exist or is expired
        if (!item || item.expiry < Date.now()) {
            if (item) this.cache.delete(id); // Clean up expired item
            return null;
        }

        return item.data;
    }

    set(id: string, product: Product): void {
        this.cache.set(id, {
            data: product,
            expiry: Date.now() + CACHE_EXPIRY_MS
        });
    }

    // Store image URL in cache
    setImageUrl(imageId: string, url: string): void {
        this.imageCache.set(imageId, {
            data: url,
            expiry: Date.now() + IMAGE_CACHE_EXPIRY_MS
        });
    }

    // Get cached image URL
    getImageUrl(imageId: string): string | null {
        const item = this.imageCache.get(imageId);
        if (!item || item.expiry < Date.now()) {
            if (item) this.imageCache.delete(imageId);
            return null;
        }
        return item.data;
    }

    clear(): void {
        this.cache.clear();
        this.imageCache.clear();
        this.fetchPromises.clear();
    }

    // Get or fetch a product (ensures we don't make duplicate requests)
    async getOrFetch(id: string): Promise<Product | null> {
        // Return from cache if available
        const cachedProduct = this.get(id);
        if (cachedProduct) {
            return cachedProduct;
        }

        // Check if we're already fetching this product
        if (this.fetchPromises.has(id)) {
            const promise = this.fetchPromises.get(id);
            return promise!; // Safe assertion since we checked with has()
        }

        // Start a new fetch operation
        const fetchPromise = this.fetchProduct(id);
        this.fetchPromises.set(id, fetchPromise);

        try {
            const product = await fetchPromise;
            // Remove from pending promises
            this.fetchPromises.delete(id);
            return product;
        } catch (error) {
            // On error, remove from pending promises
            this.fetchPromises.delete(id);
            throw error;
        }
    }

    // Fetch multiple products in one go
    async batchFetch(ids: string[]): Promise<Record<string, Product | null>> {
        // Filter out IDs that are already in cache
        const idsToFetch = ids.filter(id => !this.get(id));

        if (idsToFetch.length === 0) {
            // All products already in cache
            return ids.reduce((acc, id) => {
                acc[id] = this.get(id);
                return acc;
            }, {} as Record<string, Product | null>);
        }

        // Start individual fetch operations for uncached products
        const fetchPromises = idsToFetch.map(id => this.getOrFetch(id));

        // Wait for all fetches to complete
        await Promise.all(fetchPromises);

        // Construct result object from cache
        return ids.reduce((acc, id) => {
            acc[id] = this.get(id);
            return acc;
        }, {} as Record<string, Product | null>);
    }

    // Internal method to fetch a product
    private async fetchProduct(id: string): Promise<Product | null> {
        try {
            const result = await getProductById(id);
            if (result.data) {
                const product = result.data as unknown as Product;
                this.set(id, product);
                return product;
            }
            return null;
        } catch (error) {
            console.error(`Error fetching product ${id}:`, error);
            return null;
        }
    }

    // Fetch and cache a product image
    async fetchImage(imageId: string): Promise<string | null> {
        // Check cache first
        const cachedUrl = this.getImageUrl(imageId);
        if (cachedUrl) {
            return cachedUrl;
        }

        try {
            const response = await getProductImage(imageId);

            if (response.error || !response.data?.file) {
                return null;
            }

            const buffer = response.data.file;
            const blob = new Blob([buffer]);
            const url = URL.createObjectURL(blob);

            // Store in cache
            this.setImageUrl(imageId, url);
            return url;
        } catch (error) {
            console.error(`Error fetching image ${imageId}:`, error);
            return null;
        }
    }

    // Utility to clean expired items
    cleanExpired(): void {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (item.expiry < now) {
                this.cache.delete(key);
            }
        }

        for (const [key, item] of this.imageCache.entries()) {
            if (item.expiry < now) {
                this.imageCache.delete(key);
            }
        }
    }
}

// Singleton instance
export const productCache = new ProductCache();

// Run periodic cleanup every 5 minutes (if this module stays loaded)
if (typeof window !== 'undefined') {
    setInterval(() => productCache.cleanExpired(), 5 * 60 * 1000);
}
