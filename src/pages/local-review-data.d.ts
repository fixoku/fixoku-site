export type LocalReviewIdentity = { slug: string; name: string; role: string; roleLabel: string; initials: string };
export declare const DEMO_IDENTITIES: readonly LocalReviewIdentity[];
export declare const isLoopback: () => boolean;
export declare const localReviewEnabled: () => boolean;
