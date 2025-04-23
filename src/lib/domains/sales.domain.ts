export interface Sale {
    $id: string;
    user_id: string;
    balance: number;
    number_of_rating: number;
    total_earning: number;
    trial_bonus: number;
    trial_bonus_date: Date | string;
    today_bonus: number;
    today_bonus_date: Date | string;
}