export type TurkeyLocation = Readonly<{
  plate: number;
  name: string;
  districts: readonly string[];
}>;

export type ResolvedTurkeyLocation = Readonly<{
  city: string;
  district: string;
}>;

export declare const TURKEY_LOCATIONS: readonly TurkeyLocation[];
export declare const TURKEY_PROVINCES: readonly string[];

export declare function getTurkeyDistricts(city: string): readonly string[];

export declare function resolveTurkeyLocation(
  city: string,
  district: string,
): ResolvedTurkeyLocation | null;

export declare function isValidTurkeyProvinceDistrict(
  city: string,
  district: string,
): boolean;