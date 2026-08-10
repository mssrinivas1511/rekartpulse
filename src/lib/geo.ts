export interface CountryInfo {
  country: string;
  dialCode: string;
  currency: string;
}

export const COUNTRIES: CountryInfo[] = [
  { country: "India", dialCode: "+91", currency: "INR" },
  { country: "United States", dialCode: "+1", currency: "USD" },
  { country: "United Kingdom", dialCode: "+44", currency: "GBP" },
  { country: "United Arab Emirates", dialCode: "+971", currency: "AED" },
  { country: "Singapore", dialCode: "+65", currency: "SGD" },
  { country: "Australia", dialCode: "+61", currency: "AUD" },
  { country: "Canada", dialCode: "+1", currency: "CAD" },
  { country: "Germany", dialCode: "+49", currency: "EUR" },
  { country: "France", dialCode: "+33", currency: "EUR" },
  { country: "Netherlands", dialCode: "+31", currency: "EUR" },
  { country: "Ireland", dialCode: "+353", currency: "EUR" },
  { country: "Spain", dialCode: "+34", currency: "EUR" },
  { country: "Italy", dialCode: "+39", currency: "EUR" },
  { country: "Japan", dialCode: "+81", currency: "JPY" },
  { country: "South Korea", dialCode: "+82", currency: "KRW" },
  { country: "China", dialCode: "+86", currency: "CNY" },
  { country: "Hong Kong", dialCode: "+852", currency: "HKD" },
  { country: "Indonesia", dialCode: "+62", currency: "IDR" },
  { country: "Malaysia", dialCode: "+60", currency: "MYR" },
  { country: "Thailand", dialCode: "+66", currency: "THB" },
  { country: "Vietnam", dialCode: "+84", currency: "VND" },
  { country: "Philippines", dialCode: "+63", currency: "PHP" },
  { country: "Bangladesh", dialCode: "+880", currency: "BDT" },
  { country: "Pakistan", dialCode: "+92", currency: "PKR" },
  { country: "Sri Lanka", dialCode: "+94", currency: "LKR" },
  { country: "Nepal", dialCode: "+977", currency: "NPR" },
  { country: "Saudi Arabia", dialCode: "+966", currency: "SAR" },
  { country: "Qatar", dialCode: "+974", currency: "QAR" },
  { country: "Kuwait", dialCode: "+965", currency: "KWD" },
  { country: "Oman", dialCode: "+968", currency: "OMR" },
  { country: "Bahrain", dialCode: "+973", currency: "BHD" },
  { country: "Israel", dialCode: "+972", currency: "ILS" },
  { country: "Turkey", dialCode: "+90", currency: "TRY" },
  { country: "South Africa", dialCode: "+27", currency: "ZAR" },
  { country: "Nigeria", dialCode: "+234", currency: "NGN" },
  { country: "Kenya", dialCode: "+254", currency: "KES" },
  { country: "Egypt", dialCode: "+20", currency: "EGP" },
  { country: "Brazil", dialCode: "+55", currency: "BRL" },
  { country: "Mexico", dialCode: "+52", currency: "MXN" },
  { country: "Argentina", dialCode: "+54", currency: "ARS" },
  { country: "Chile", dialCode: "+56", currency: "CLP" },
  { country: "Colombia", dialCode: "+57", currency: "COP" },
  { country: "New Zealand", dialCode: "+64", currency: "NZD" },
  { country: "Switzerland", dialCode: "+41", currency: "CHF" },
  { country: "Sweden", dialCode: "+46", currency: "SEK" },
  { country: "Norway", dialCode: "+47", currency: "NOK" },
  { country: "Denmark", dialCode: "+45", currency: "DKK" },
  { country: "Poland", dialCode: "+48", currency: "PLN" },
];

export const CURRENCIES = Array.from(new Set(COUNTRIES.map((c) => c.currency))).sort();

export function currencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat("en", { style: "currency", currency })
      .formatToParts(0)
      .find((p) => p.type === "currency");
    return parts?.value ?? currency;
  } catch {
    return currency;
  }
}
