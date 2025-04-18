export interface Withdrawal {
    $id: string;
    user_id: string;
    withdraw_amount: number;
    requested_at: Date;
    status: number;
}