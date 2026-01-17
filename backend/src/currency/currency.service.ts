import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CurrencyConversionResult {
  eurAmount: number;
  rsdAmount: number;
  exchangeRate: number;
}

@Injectable()
export class CurrencyService {
  private readonly exchangeRate: number;

  constructor(private configService: ConfigService) {
    this.exchangeRate = this.configService.get<number>('FIXED_EUR_TO_RSD_RATE', 117.0);
  }

  convertEurToRsd(eur: number): number {
    return Math.round(eur * this.exchangeRate * 100) / 100;
  }

  convertRsdToEur(rsd: number): number {
    return Math.round((rsd / this.exchangeRate) * 100) / 100;
  }

  getCurrentRate(): number {
    return this.exchangeRate;
  }

  /**
   * Converts an amount to both EUR and RSD based on the provided currency
   * @param amount - The amount to convert
   * @param currency - The currency of the provided amount ('EUR' or 'RSD')
   * @returns An object containing eurAmount, rsdAmount, and exchangeRate
   */
  convertAmount(amount: number, currency: 'EUR' | 'RSD'): CurrencyConversionResult {
    const exchangeRate = this.getCurrentRate();

    if (currency === 'EUR') {
      return {
        eurAmount: amount,
        rsdAmount: this.convertEurToRsd(amount),
        exchangeRate
      };
    }

    return {
      eurAmount: this.convertRsdToEur(amount),
      rsdAmount: amount,
      exchangeRate
    };
  }
}
