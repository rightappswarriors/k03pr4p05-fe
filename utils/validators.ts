// utils/validators.ts
// Shared validation helpers used across all ERP modals.

export interface ValidationResult {
  valid:   boolean;
  message: string;
}

const ok  = (): ValidationResult => ({ valid: true,  message: '' });
const err = (message: string): ValidationResult => ({ valid: false, message });

// ── Numeric ───────────────────────────────────────────────────────────────────

export function validatePositiveNumber(
  raw: string,
  label: string,
  opts?: { min?: number; max?: number; allowZero?: boolean }
): ValidationResult {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, allowZero = false } = opts ?? {};
  const trimmed = raw.trim();
  if (!trimmed) return err(`${label} is required.`);
  const n = parseFloat(trimmed);
  if (isNaN(n) || !isFinite(n)) return err(`${label} must be a valid number.`);
  if (!allowZero && n <= 0)     return err(`${label} must be greater than zero.`);
  if (allowZero  && n <  0)     return err(`${label} cannot be negative.`);
  if (n > max)                  return err(`${label} cannot exceed ${max}.`);
  return ok();
}

export function validateOptionalNumber(
  raw: string,
  label: string,
  opts?: { min?: number; max?: number }
): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return ok(); // optional — blank is fine
  return validatePositiveNumber(raw, label, { ...opts, allowZero: true });
}

export function validatePercentage(raw: string, label: string): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return ok(); // optional
  const n = parseFloat(trimmed);
  if (isNaN(n)) return err(`${label} must be a number.`);
  if (n < 0 || n > 100) return err(`${label} must be between 0 and 100.`);
  return ok();
}

export function validateInteger(
  raw: string,
  label: string,
  opts?: { min?: number; max?: number }
): ValidationResult {
  const { min = 1, max = 99999 } = opts ?? {};
  const trimmed = raw.trim();
  if (!trimmed) return err(`${label} is required.`);
  const n = parseInt(trimmed, 10);
  if (isNaN(n) || String(n) !== trimmed.replace(/\.0+$/, ''))
    return err(`${label} must be a whole number.`);
  if (n < min) return err(`${label} must be at least ${min}.`);
  if (n > max) return err(`${label} must be ${max} or less.`);
  return ok();
}

// ── Text ──────────────────────────────────────────────────────────────────────

export function validateName(raw: string, label = 'Name'): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed)       return err(`${label} is required.`);
  if (trimmed.length < 2) return err(`${label} must be at least 2 characters.`);
  if (!/^[a-zA-ZÀ-ÿ\s.''-]+$/.test(trimmed))
    return err(`${label} can only contain letters, spaces, and punctuation.`);
  return ok();
}

export function validateEmail(raw: string, required = false): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return required ? err('Email is required.') : ok();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed))
    return err('Enter a valid email address.');
  return ok();
}

export function validatePHPhone(raw: string, required = false): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return required ? err('Phone number is required.') : ok();
  // Accepts: +63 9XXXXXXXXX, 09XXXXXXXXX, 9XXXXXXXXX (with optional spaces/dashes)
  const cleaned = trimmed.replace(/[\s\-]/g, '');
  if (!/^(\+639|09|9)\d{9}$/.test(cleaned))
    return err('Enter a valid PH phone number (e.g. +63 9XX XXX XXXX).');
  return ok();
}

export function validateOutletCode(raw: string): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return ok(); // auto-generated if blank
  if (trimmed.length > 12) return err('Outlet code must be 12 characters or less.');
  if (!/^[A-Z0-9_-]+$/.test(trimmed))
    return err('Code must be uppercase letters, numbers, underscores, or hyphens only.');
  return ok();
}

// ── Composite — run multiple validators, return first error ───────────────────

export function runValidators(
  ...results: ValidationResult[]
): ValidationResult {
  return results.find(r => !r.valid) ?? { valid: true, message: '' };
}