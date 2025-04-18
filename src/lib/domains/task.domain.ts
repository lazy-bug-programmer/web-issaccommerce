export interface Task {
    $id: string;
    user_id: string;
    progress: string;
    last_edit: string | Date; // Server stores as ISO string, client converts to Date
}