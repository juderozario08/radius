import { formatMoney, fromCents, multiplyMoney, prorateMoney, toCents } from "./money";

describe("toCents", () => {
    it.each([
        [12.34, 1234],
        [0.1 + 0.2, 30],
        [1.005, 101],
        [-35.5, -3550],
        [19.99, 1999],
        [0, 0],
        [null, 0],
        [undefined, 0],
        [NaN, 0],
        [Infinity, 0],
    ])("converts %p to %p cents", (value, expected) => {
        expect(toCents(value)).toBe(expected);
    });
});

describe("multiplyMoney", () => {
    it("multiplies in cents to avoid float drift", () => {
        expect(multiplyMoney(19.99, 3)).toBe(59.97);
        expect(multiplyMoney(0.1, 3)).toBe(0.3);
        expect(multiplyMoney(undefined, 4)).toBe(0);
    });
});

describe("fromCents", () => {
    it("converts cents back to a decimal amount", () => {
        expect(fromCents(6717)).toBe(67.17);
        expect(fromCents(-5)).toBe(-0.05);
    });
});

describe("formatMoney", () => {
    it.each([
        [12.34, "$12.34"],
        [12.5, "$12.50"],
        [0, "$0.00"],
        [0.05, "$0.05"],
        [-35.5, "-$35.50"],
        [1234567.89, "$1234567.89"],
        [0.1 + 0.2, "$0.30"],
        [null, "$0.00"],
        [undefined, "$0.00"],
    ])("formats %p as %p", (value, expected) => {
        expect(formatMoney(value)).toBe(expected);
    });
});

describe("prorateMoney", () => {
    it.each([
        [12, 50, 100, 6],
        [13.4, 1.03, 103.09, 0.13],
        [0.03, 0.01, 0.02, 0.02],
        [-0.03, 0.01, 0.02, -0.02],
        [13.4, 103.09, 103.09, 13.4],
        [13.4, 1.03, 0, 0],
    ])("prorates %p by %p of %p to %p", (value, part, whole, expected) => {
        expect(prorateMoney(value, part, whole)).toBe(expected);
    });
});
