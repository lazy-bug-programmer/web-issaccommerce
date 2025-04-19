export interface Product {
    $id: string;
    name: string;
    description: string;
    image_urls: string[];
    quantity: number;
    price: number;
    discount_rate: number;
}