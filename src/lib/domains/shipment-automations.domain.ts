export interface ShipmentAutomation {
    $id?: string;
    name: string;
    progress: string;
}

export interface AutomationRule {
    name: string;
    after_hour: number;
}