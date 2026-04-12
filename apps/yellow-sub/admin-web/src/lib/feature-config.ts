import { formatMinorUnits } from './currency';
import type { Feature, PlanFeature } from './types';

export type MoneyConfigStored = {
  currency: string;
  amountMinor: number;
};

function isZeroDecimalCurrency(currency: string): boolean {
  return ['JPY', 'KRW', 'VND'].includes(currency);
}

export function majorAmountStringFromMinor(minor: number, currency: string): string {
  if (isZeroDecimalCurrency(currency)) return String(minor);
  const major = minor / 100;
  if (Number.isInteger(major)) return String(major);
  return String(major);
}

export function parseMajorAmountToMinor(raw: string, currency: string): number | null {
  const s = raw.trim().replace(/,/g, '');
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('Amount must be a non-negative number or left empty for unlimited');
  }
  if (isZeroDecimalCurrency(currency)) return Math.round(n);
  return Math.round(n * 100);
}

export function parseStoredMoneyConfig(value: string | null | undefined): MoneyConfigStored | null {
  if (value == null || value.trim() === '') return null;
  try {
    const j = JSON.parse(value) as unknown;
    if (!j || typeof j !== 'object') return null;
    const o = j as Record<string, unknown>;
    const currency = typeof o.currency === 'string' ? o.currency : '';
    const amountMinor = typeof o.amountMinor === 'number' ? o.amountMinor : NaN;
    if (!currency || !Number.isFinite(amountMinor) || amountMinor < 0) return null;
    return { currency, amountMinor };
  } catch {
    return null;
  }
}

export function moneyConfigToJson(currency: string, amountMinor: number): string {
  return JSON.stringify({ currency, amountMinor });
}

/** Normalized integer string for API, or null = unlimited */
export function parseIntegerConfigInput(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.toLowerCase() === 'unlimited') return null;
  if (!/^-?\d+$/.test(t)) throw new Error('Config value must be an integer or unlimited');
  const n = parseInt(t, 10);
  if (n < 0) throw new Error('Config value must be non-negative');
  return String(n);
}

export function parseMoneyConfigInput(rawAmount: string, currency: string): string | null {
  const minor = parseMajorAmountToMinor(rawAmount, currency);
  if (minor == null) return null;
  if (!currency?.trim()) throw new Error('Select a currency for the money value');
  return moneyConfigToJson(currency.trim(), minor);
}

export function formatPlanFeatureConfigDisplay(pf: PlanFeature, feat: Feature | undefined): string {
  if (!feat || feat.type !== 'CONFIG') return '—';
  if (feat.configType === 'ENUM') {
    return pf.configValue?.trim() ? pf.configValue : '—';
  }
  if (feat.configType === 'MONEY') {
    const parsed = parseStoredMoneyConfig(pf.configValue);
    if (!parsed) return 'Unlimited';
    const money = formatMinorUnits(parsed.amountMinor, parsed.currency);
    const unit = feat.unitLabel?.trim();
    return unit ? `${money} ${unit}` : money;
  }
  // INTEGER (and unknown)
  if (pf.configValue == null || pf.configValue.trim() === '') return 'Unlimited';
  const n = parseInt(pf.configValue, 10);
  if (!Number.isFinite(n)) return pf.configValue;
  const unit = feat.unitLabel?.trim();
  return unit ? `${n.toLocaleString()} ${unit}` : n.toLocaleString();
}
