import type { Promotion } from '../entities/promotion.entity';

export const PROMOTION_REPOSITORY = Symbol('PROMOTION_REPOSITORY');

export interface PromotionRepository {
  save(promotion: Promotion): Promise<void>;
  findAll(): Promise<Promotion[]>;
}
