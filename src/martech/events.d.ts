export type TrackingOptions = { target?: unknown; source?: string; consent?: unknown; includeAttribution?: boolean };
export type TrackingResult = { pushed: boolean; reason: string; event: Record<string, unknown> | null };
export declare function pushEvent(event: string, properties?: Record<string, unknown>, options?: TrackingOptions): TrackingResult;
