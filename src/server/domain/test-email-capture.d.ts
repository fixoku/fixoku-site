export function isTestEmailCaptureEnabled(env?: Record<string, string>): boolean;
export function captureLifecycleMail(message: { kind?: string; to?: string; url?: string }, env?: Record<string, string>): boolean;
export function consumeLifecycleMail(predicate?: (message: { kind: string; to: string; url: string }) => boolean): { kind: string; to: string; url: string } | null;
export function clearLifecycleMail(): void;
export function pendingLifecycleMail(): number;
