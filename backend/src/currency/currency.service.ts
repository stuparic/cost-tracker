import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
}
