export interface Orders {
    ordered_at: string | Date; // Server stores as ISO string, client converts to Date
    product_id: string;
    amount: number;
    user_id: string;
    shipment_automation_id: string;
}