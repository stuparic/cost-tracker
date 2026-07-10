import { Injectable } from '@nestjs/common';

@Injectable()
export class CategoryInferenceService {
  private readonly shopPatterns: Record<string, RegExp> = {
    Groceries: /(maxi|lidl|mercator|idea|tempo|aman|dis|persu|mikro market|market)/i,
    Home: /(ikea|jysk|emezeta|pepco|hidroponika)/i,
    Transport: /(nis|petrol|mol|lukoil|omv|tifon|coral|hac |putarina|toll|vinjeta|vintrica|vignette|parking|taxi|bolt|car|avia|pumpa|gorivo)/i,
    Health: /(apoteka|pharmacy|lilly|benu|zegin|jankovic)/i,
    Electronics: /(gigatron|tehnomanija|comtrade|mediamarkt|tech|tahnologija)/i,
    Dining: /(restoran|restaurant|cafe|kafana|pizza|burger|mcdon|hrana)/i,
    Clothing: /(zara|h&m|mango|new\s*yorker|fashion|clothes|odeca)/i,
    Travel: /(kamp|camp|hotel|hostel|apartman|booking|airbnb)/i,
    Work: /(coworking|lynx)/i,
    Utilities: /(trajnog naloga|trajni nalog)/i,
    Charity: /(fond|fonda|donacij|humanitar|crveni krst|unicef)/i
  };

  /**
   * Infers the expense category based on shop name patterns
   * @param shopName - The name of the shop
   * @returns The inferred category or null if no match is found
   */
  inferCategory(shopName: string): string | null {
    const shopLower = shopName.toLowerCase();

    for (const [category, pattern] of Object.entries(this.shopPatterns)) {
      if (pattern.test(shopLower)) {
        return category;
      }
    }

    return null;
  }
}
