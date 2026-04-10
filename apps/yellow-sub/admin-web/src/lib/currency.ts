export const CURRENCIES = [
  { value: 'GBP', label: 'GBP – British Pound' },
  { value: 'USD', label: 'USD – US Dollar' },
  { value: 'EUR', label: 'EUR – Euro' },
  { value: 'AUD', label: 'AUD – Australian Dollar' },
  { value: 'CAD', label: 'CAD – Canadian Dollar' },
  { value: 'CHF', label: 'CHF – Swiss Franc' },
  { value: 'JPY', label: 'JPY – Japanese Yen' },
  { value: 'NZD', label: 'NZD – New Zealand Dollar' },
  { value: 'SEK', label: 'SEK – Swedish Krona' },
  { value: 'NOK', label: 'NOK – Norwegian Krone' },
  { value: 'DKK', label: 'DKK – Danish Krone' },
  { value: 'SGD', label: 'SGD – Singapore Dollar' },
  { value: 'HKD', label: 'HKD – Hong Kong Dollar' },
  { value: 'INR', label: 'INR – Indian Rupee' },
  { value: 'BRL', label: 'BRL – Brazilian Real' },
  { value: 'MXN', label: 'MXN – Mexican Peso' },
  { value: 'PLN', label: 'PLN – Polish Zloty' },
  { value: 'ZAR', label: 'ZAR – South African Rand' },
];

export function formatMinorUnits(minor: number, currency: string): string {
  const isZeroDecimal = ['JPY', 'KRW', 'VND'].includes(currency);
  const amount = isZeroDecimal ? minor : minor / 100;
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount);
}
