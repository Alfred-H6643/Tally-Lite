
// Exchange rates configuration
// 1 JPY = 0.2 TWD
// 1 USD = 30 TWD
// 1 EUR = 35 TWD
export const EXCHANGE_RATES: Record<string, number> = {
    'TWD': 1,
    'JPY': 0.2,
    'USD': 30,
    'EUR': 35,
    // Add more defaults if needed
    'CNY': 4.3,
    'GBP': 39,
    'KRW': 0.024
};

/**
 * Converts an amount from a source currency to TWD based on fixed rates.
 * @param amount The amount in source currency
 * @param currency The source currency code (e.g., 'USD', 'JPY')
 * @returns The amount converted to TWD (rounded to integer usually, but keeping float for precision)
 */
export const convertAmountToTWD = (amount: number, currency: string): number => {
    if (!amount) return 0;
    if (currency === 'TWD') return amount;

    const rate = EXCHANGE_RATES[currency];
    if (rate === undefined) {
        console.warn(`Exchange rate not found for ${currency}, assuming 1:1`);
        return amount; // Fallback
    }

    return amount * rate;
};

/**
 * Formats a currency amount with symbol prefix.
 * @param amount The value
 * @param currency The currency code
 */
export const formatCurrency = (amount: number, currency: string = 'TWD'): string => {
    return new Intl.NumberFormat('zh-TW', { style: 'currency', currency }).format(amount);
};
