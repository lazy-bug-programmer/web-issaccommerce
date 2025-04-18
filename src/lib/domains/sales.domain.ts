export interface Sale {
    $id: string;
    user_id: string;
    balance: number;
    number_of_rating: number;
    total_earning: number;
    trial_balance: number | null;
}