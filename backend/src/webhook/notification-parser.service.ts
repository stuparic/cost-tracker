import { Injectable } from '@nestjs/common';

export interface ParsedPayment {
  amount: number;
  currency: 'RSD' | 'EUR';
  merchant: string | null;
}

/**
 * Parses payment notifications from Google Wallet and Serbian banking apps.
 *
 * Handles amounts in both Serbian ("1.234,56") and plain ("1234.56") formats,
 * with the currency before or after the number. Merchant is extracted from
 * common patterns ("kod MAXI", "Mesto: MAXI 123") or falls back to the
 * notification title (Google Wallet puts the merchant there).
 */
@Injectable()
export class NotificationParserService {
  // amount followed by currency: "702,00 RSD", "5,00 €", "1.234 din"
  private readonly amountCurrencyRe = /(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(RSD|DIN\.?|€|EUR)/i;
  // currency followed by amount: "RSD 702,00", "EUR 5.00"
  private readonly currencyAmountRe = /(RSD|EUR|€)\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i;

  private readonly merchantPatterns: RegExp[] = [
    /(?:mesto|lokacija|merchant)[:\s]+([^\n,;]{2,50})/i,
    // "702,00 RSD na NETFLIX.COM" / "5 € kod MAXI" (Yettel Bank and similar)
    /(?:RSD|EUR|€|din\.?)\s+(?:na|kod|u)\s+([^\n,;]{2,50})/i,
    /(?:kod|at)\s+([A-Za-zĆČŠĐŽćčšđž0-9][^\n,;.]{1,49})/,
    /(?:placanje|plaćanje|kupovina)\s+(?:na|u)\s+([^\n,;.]{2,50})/i
  ];

  // titles that are app chrome or a bank name, not a merchant
  private readonly genericTitles =
    /google\s*(pay|wallet)|novčanik|placanje|plaćanje|obavestenje|obaveštenje|transakcija|notification|payment|bank|banka|yettel|mobi|raiffeisen|intesa|unicredit|otp|nlb|aik|erste|poštanska|komercijalna/i;

  parse(text: string, title?: string): ParsedPayment | null {
    const haystack = `${title ?? ''}\n${text}`;

    const amount = this.parseAmount(haystack);
    if (amount === null) return null;

    return {
      amount: amount.value,
      currency: amount.currency,
      merchant: this.parseMerchant(haystack, title)
    };
  }

  private parseAmount(haystack: string): { value: number; currency: 'RSD' | 'EUR' } | null {
    let raw: string | undefined;
    let currencyRaw: string | undefined;

    const m1 = this.amountCurrencyRe.exec(haystack);
    if (m1) {
      raw = m1[1];
      currencyRaw = m1[2];
    } else {
      const m2 = this.currencyAmountRe.exec(haystack);
      if (m2) {
        currencyRaw = m2[1];
        raw = m2[2];
      }
    }

    if (!raw || !currencyRaw) return null;

    const value = this.normalizeNumber(raw);
    if (!Number.isFinite(value) || value <= 0) return null;

    const currency: 'RSD' | 'EUR' = /€|eur/i.test(currencyRaw) ? 'EUR' : 'RSD';
    return { value, currency };
  }

  /** "1.234,56" -> 1234.56, "1,50" -> 1.5, "1234.56" -> 1234.56, "1234" -> 1234 */
  private normalizeNumber(raw: string): number {
    let s = raw;
    if (s.includes('.') && s.includes(',')) {
      // Serbian format: dots are thousands separators, comma is decimal
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    } else if (/\.\d{3}$/.test(s) && !/\.\d{1,2}$/.test(s)) {
      // "1.234" with exactly 3 digits after the dot is a thousands separator
      s = s.replace(/\./g, '');
    }
    return parseFloat(s);
  }

  private parseMerchant(haystack: string, title?: string): string | null {
    for (const pattern of this.merchantPatterns) {
      const match = pattern.exec(haystack);
      if (match?.[1]) {
        return this.cleanMerchant(match[1]);
      }
    }

    if (title && !this.genericTitles.test(title) && !this.amountCurrencyRe.test(title)) {
      return this.cleanMerchant(title);
    }

    return null;
  }

  private cleanMerchant(raw: string): string | null {
    const cleaned = raw
      .replace(/\s+/g, ' ')
      .replace(/\s*(RS|SRB|BEOGRAD|BGD|NOVI SAD)\s*$/i, '')
      .trim();
    return cleaned.length >= 2 ? cleaned : null;
  }
}
