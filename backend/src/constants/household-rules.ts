/**
 * Household-specific classification rules for bank statement transactions,
 * agreed with the user (July 2026, re-confirmed October 2026). Shared by the
 * statement import (expenses/incomes) and the statement reports.
 *
 * - Debits to OTP banka are the car loan installment.
 * - Debits transferring money to the account holder's own account at another
 *   bank ("Dejan S...") service the apartment loan, up to
 *   HOME_LOAN_CAP_EUR per monthly statement. Whatever exceeds the cap is just
 *   money moved to the other account.
 * - Credits from MILOŠ ORLIĆ are rent income.
 */
export const CAR_LOAN_PATTERN = /otp\s*bank/i;
export const SELF_TRANSFER_DEBIT_PATTERN = /(^|\s)dejan\s+s(\b|tupari)/i;
export const HOME_LOAN_CAP_EUR = 780;

/** The account holder's own name - a credit "from" this name is a self-transfer, not income */
export const OWN_NAME_PATTERN = /dejan\s+stupari[cć]/i;

/**
 * Known recurring counterparties with a fixed income type, learned from real
 * statements reviewed with the user.
 */
export const KNOWN_INCOME_SOURCES: Array<{ pattern: RegExp; incomeType: string }> = [
  { pattern: /milo[sš]\s+orli[cć]/i, incomeType: 'Rent' }
];
