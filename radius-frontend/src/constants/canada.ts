// radius-frontend/src/constants/canada.ts
export const CANADIAN_PROVINCES = [
    "Alberta",
    "British Columbia",
    "Manitoba",
    "New Brunswick",
    "Newfoundland and Labrador",
    "Nova Scotia",
    "Ontario",
    "Prince Edward Island",
    "Quebec",
    "Saskatchewan",
    "Northwest Territories",
    "Nunavut",
    "Yukon",
] as const;

export type CanadianProvince = (typeof CANADIAN_PROVINCES)[number];

export function normalizeCanadianPostalCode(postalCode: string): string | null {
    const normalized = postalCode.toUpperCase().replace(/\s+/g, "");
    if (normalized.length !== 6) return null;

    for (let i = 0; i < normalized.length; i++) {
        const c = normalized[i];
        if (i % 2 === 1) {
            if (c < "0" || c > "9") return null;
        } else if (c < "A" || c > "Z") {
            return null;
        }
    }

    return normalized;
}

export function isCanadianProvince(value: string): value is CanadianProvince {
    return (CANADIAN_PROVINCES as readonly string[]).includes(value);
}
