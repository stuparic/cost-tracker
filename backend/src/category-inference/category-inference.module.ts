import { Module } from '@nestjs/common';
import { CategoryInferenceService } from './category-inference.service';
import { CategoryLearningService } from './category-learning.service';
import { CategoryLearningRepository } from './category-learning.repository';

@Module({
  providers: [CategoryInferenceService, CategoryLearningService, CategoryLearningRepository],
  exports: [CategoryInferenceService, CategoryLearningService]
})
export class CategoryInferenceModule {}
