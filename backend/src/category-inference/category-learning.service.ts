import { Injectable, Logger } from '@nestjs/common';
import { CategoryLearningRepository, LearnedCategory } from './category-learning.repository';

/**
 * Learns "merchant -> category" mappings from the user's own corrections and
 * applies them automatically next time. Merchant names are normalized so small
 * differences (case, diacritics, terminal codes) still match.
 */
@Injectable()
export class CategoryLearningService {
  private readonly logger = new Logger(CategoryLearningService.name);

  constructor(private readonly repo: CategoryLearningRepository) {}

  /** Normalizes a shop/merchant name into a stable lookup key. */
  normalize(merchant: string): string {
    return (merchant || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // strip diacritics
      .replace(/[^a-z0-9 ]/g, ' ') // drop punctuation/terminal codes
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
  }

  /** Remembers that this merchant should map to this category (best-effort). */
  async record(householdId: string | undefined, merchant: string, category: string | undefined): Promise<void> {
    if (!householdId || !merchant || !category) return;
    const key = this.normalize(merchant);
    if (!key) return;
    try {
      await this.repo.record(householdId, key, category);
    } catch (error) {
      // Learning is a nice-to-have; never let it break the main operation.
      this.logger.warn(`Failed to record category override: ${error instanceof Error ? error.message : error}`);
    }
  }

  /** Returns a previously learned category for this merchant, or null. */
  async lookup(householdId: string | undefined, merchant: string): Promise<string | null> {
    if (!householdId || !merchant) return null;
    const key = this.normalize(merchant);
    if (!key) return null;
    try {
      return await this.repo.lookup(householdId, key);
    } catch (error) {
      this.logger.warn(`Failed to look up category override: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /** All learned mappings for a household (normalized merchant -> category). */
  async getAll(householdId: string | undefined): Promise<LearnedCategory[]> {
    if (!householdId) return [];
    try {
      return await this.repo.getAll(householdId);
    } catch (error) {
      this.logger.warn(`Failed to load category overrides: ${error instanceof Error ? error.message : error}`);
      return [];
    }
  }
}
