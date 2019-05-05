/**
 * Formats a number to 2 decimal points
 * @param  {Number} number The number to format
 * @return {Number}
 */
export function round2Decimal(number) {
    return Math.max(0, Math.round(number * 100) / 100);
}
