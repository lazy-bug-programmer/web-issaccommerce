export interface Task {
    $id: string;
    user_id: string;
    progress: string;
    allow_system_reset: boolean;
    last_edit: string | Date; // Server stores as ISO string, client converts to Date
}