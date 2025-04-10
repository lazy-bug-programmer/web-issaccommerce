export interface Product {
    $id: string;
    user_id: string;
    name: string;
    description: string;
    image_url: string;
    quantity: number;
    price: number;
    discount_rate: number;
}