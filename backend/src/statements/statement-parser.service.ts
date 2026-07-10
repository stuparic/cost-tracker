import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- pdf-parse is CJS-only; default import breaks at runtime
import pdfParse = require('pdf-parse');
import { EXPENSE_CATEGORIES } from '../constants/categories';
import { SERBIAN_SHOPS } from '../constants/serbian-shops';
import { StatementTransaction } from './interfaces/statement-transaction.interface';

/**
 * Extracts raw text from a bank statement PDF and uses Gemini to convert it
 * into a structured list of transactions.
 */
@Injectable()
export class StatementParserService {
  private readonly logger = new Logger(StatementParserService.name);
  private readonly genAI: GoogleGenAI;

  constructor() {
    this.genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async parsePdf(buffer: Buffer): Promise<StatementTransaction[]> {
    const pdf = await pdfParse(buffer);
    if (!pdf.text || pdf.text.trim().length < 50) {
      throw new Error('Could not extract text from the PDF (is it a scanned image?)');
    }
    return this.parseStatementText(pdf.text);
  }

  private async parseStatementText(text: string): Promise<StatementTransaction[]> {
    const result = await this.generateWithRetry(this.buildPrompt(text));

    const cleaned = (result.text || '').replace(/```json\n?|\n?```/g, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      this.logger.error(`Gemini returned non-JSON statement response: ${cleaned.slice(0, 500)}`);
      throw new Error('AI returned an invalid response while parsing the statement');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('AI response is not a transaction list');
    }

    return parsed.filter(tx => this.isValidTransaction(tx)).map(tx => this.normalizeTransaction(tx));
  }

  /**
   * Gemini occasionally returns transient 503s under load - retry with backoff,
   * then fall back to an alternative model before giving up. Preview models are
   * the first to run out of capacity, so the fallback should be a stable one.
   */
  private async generateWithRetry(prompt: string) {
    const primary = process.env.GEMINI_MODEL_NAME || 'gemini-flash-lite-latest';
    const fallback = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash';
    const models = fallback && fallback !== primary ? [primary, fallback] : [primary];

    let lastError: unknown;
    for (const model of models) {
      const attempts = model === primary ? 3 : 2;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          return await this.genAI.models.generateContent({ model, contents: prompt });
        } catch (error) {
          lastError = error;
          const message = error instanceof Error ? error.message : String(error);
          const transient = /503|UNAVAILABLE|429|RESOURCE_EXHAUSTED|overloaded/i.test(message);
          if (!transient) throw error;
          if (attempt === attempts) {
            this.logger.warn(
              `Gemini model ${model} unavailable after ${attempts} attempts${model === primary ? ', switching to fallback' : ''}`
            );
            break;
          }
          const delayMs = 2000 * attempt;
          this.logger.warn(`Gemini transient error on ${model} (attempt ${attempt}/${attempts}), retrying in ${delayMs}ms`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    const lastMessage = lastError instanceof Error ? lastError.message : String(lastError);
    if (/503|UNAVAILABLE|429|RESOURCE_EXHAUSTED|overloaded/i.test(lastMessage)) {
      throw new Error('AI servis za čitanje izvoda je trenutno preopterećen. Pokušaj ponovo za nekoliko minuta.');
    }
    throw lastError;
  }

  private isValidTransaction(tx: any): boolean {
    return (
      tx &&
      typeof tx.ref === 'string' &&
      tx.ref.length > 0 &&
      typeof tx.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(tx.date) &&
      typeof tx.amount === 'number' &&
      tx.amount > 0 &&
      (tx.direction === 'debit' || tx.direction === 'credit')
    );
  }

  private normalizeTransaction(tx: any): StatementTransaction {
    return {
      ref: String(tx.ref).trim(),
      date: tx.date,
      rawDescription: String(tx.rawDescription || tx.merchant || '').trim(),
      merchant: String(tx.merchant || tx.rawDescription || 'Other').trim(),
      category: tx.direction === 'debit' ? tx.category || 'General' : undefined,
      amount: Math.round(tx.amount * 100) / 100,
      direction: tx.direction,
      travel: tx.travel === true,
      travelPlace: tx.travel === true && typeof tx.travelPlace === 'string' ? tx.travelPlace.trim().slice(0, 60) : undefined
    };
  }

  private buildPrompt(statementText: string): string {
    return `You are a bank statement parser for a Serbian household expense tracker.

Below is the raw text extracted from a Serbian bank statement PDF (e.g. Yettel Bank "IZVOD").
Extract EVERY transaction row into a JSON array.

Statement text:
"""
${statementText}
"""

For each transaction extract:
- "ref": the bank reference number from the "Ref. [...]" line, digits only (e.g. "94735212551001")
- "date": the VALUE date ("Dat. valute") in YYYY-MM-DD format
- "rawDescription": the original transaction description exactly as printed
- "merchant": a cleaned, human-friendly merchant or counterparty name.
  Strip payment prefixes like "GooglePay", terminal codes like "MP246"/"213 -", and trailing city names.
  If the merchant clearly matches one of these known Serbian shops, use the EXACT spelling from this list:
  ${SERBIAN_SHOPS.join(', ')}
  Otherwise use the cleaned name (e.g. "Podizanje gotovine" for ATM withdrawals, "Interni transfer" for internal transfers).
  NEVER output "Other", "Unknown" or an empty string as the merchant - always derive a short human-readable name
  from the description (e.g. "Naplata trajnog naloga", "Nemanja Zlatic Pr Lynx", "Dejan S", "HAC putarina").
- "amount": the transaction amount as a number. Serbian number format uses "." for thousands and "," for decimals ("33.437,00" = 33437.00). Always positive.
- "direction": "debit" if the amount is in the Isplata (outgoing) column, "credit" if in the Uplata (incoming) column.
- "category": for debits only, one of: ${EXPENSE_CATEGORIES.join(', ')}.
  Category rules:
  * Fuel stations and road tolls = "Transport": NIS, OMV, MOL, Petrol, Tifon, Lukoil, Coral, HAC (Croatian tolls),
    "putarina", and pump terminals named like "NOVI SAD 1"/"NS 5478TX" (a city name + short number is almost always a fuel pump).
  * "Naplata trajnog naloga" (standing orders) = "Utilities" (recurring household bills).
  * Camps, hotels, hostels, apartments, booking platforms, tourist services = "Travel".
  * Coworking spaces (e.g. "Lynx") = "Work".
  * QR payments or transfers to PRIVATE INDIVIDUALS (a personal first name + surname or initial, e.g. "Ivica S",
    "Petar Petrovic") = "Transfers". Note: names followed by "Pr"/"doo" are registered businesses, NOT private individuals.
  * Donations to foundations, funds, humanitarian organizations (e.g. "Kancelarija dečijeg fonda", Crveni krst, UNICEF) = "Charity".
  * Road vignettes and toll stickers (e.g. "vintrica" = vignette webshop) = "Transport".
  * ATM withdrawals ("Podizanje gotovine") = "Other". Internal transfers = "Other".
- "travel": boolean, true when the transaction clearly happened abroad or on a trip (foreign city like Ljubljana/Zagreb/Maribor,
  a "Kurs:" exchange-rate note with EUR/foreign currency, or a foreign merchant). Serbian cities (Novi Sad, Beograd...) = false.
  The category should still describe WHAT was bought (Groceries for a foreign supermarket, Transport for foreign fuel/tolls,
  Dining for restaurants); "travel" only marks the trip context. Pure accommodation/tourist costs keep category "Travel".
- "travelPlace": only when "travel" is true - the location as "City, Country" with the country name in Serbian
  (e.g. "Ljubljana, Slovenija", "Zagreb, Hrvatska", "Maribor, Slovenija"). Derive it from the city printed in the
  transaction row. If only the country is known, use just the country ("Slovenija"). Omit when unknown.

Rules:
- Include ALL transactions: card payments, ATM withdrawals, transfers, QR payments, fees.
- Skip the "Prethodno stanje" (previous balance) row - it is not a transaction.
- Do NOT invent transactions; every entry must correspond to a numbered row in the statement.
- Return ONLY a valid JSON array, no markdown, no code blocks, no commentary.`;
  }
}
