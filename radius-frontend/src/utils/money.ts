export type Money = number;

export function toCents(value: Money | null | undefined): number {
    if (value == null || !Number.isFinite(value)) return 0;
    // toPrecision(15) strips binary noise such as 1.005 * 100 === 100.49999999999999
    const scaled = Number((Math.abs(value) * 100).toPrecision(15));
    return Math.sign(value) * Math.round(scaled) || 0;
}

export function fromCents(cents: number): Money {
    return cents / 100;
}

export function multiplyMoney(value: Money | null | undefined, quantity: number): Money {
    return fromCents(toCents(value) * quantity);
}

export function formatMoney(value: Money | null | undefined): string {
    const cents = toCents(value);
    const absolute = Math.abs(cents);
    const dollars = Math.floor(absolute / 100);
    const remainder = String(absolute % 100).padStart(2, "0");
    return `${cents < 0 ? "-" : ""}$${dollars}.${remainder}`;
}

export function sumMoney(values: readonly (Money | null | undefined)[]): Money {
    return fromCents(values.reduce<number>((cents, value) => cents + toCents(value), 0));
}

export function taxAtRatePer100000(value: Money, ratePer100000: number): Money {
    const cents = toCents(value);
    const tax = Math.floor((Math.abs(cents) * ratePer100000 + 50000) / 100000);
    return fromCents(Math.sign(cents) * tax || 0);
}

export function formatSignedMoney(value: Money | null | undefined): string {
    const cents = toCents(value);
    if (cents === 0) return formatMoney(0);
    return `${cents < 0 ? "-" : "+"}${formatMoney(Math.abs(cents) / 100)}`;
}
