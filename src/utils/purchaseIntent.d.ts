export function rememberStudentPurchaseIntent(packageVersionId: string): boolean;
export function readStudentPurchaseIntent(): { packageVersionId: string } | null;
export function consumeStudentPurchaseIntent(): { packageVersionId: string } | null;
