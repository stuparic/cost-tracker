import { Module } from '@nestjs/common';
import { CategoryInferenceService } from './category-inference.service';

@Module({
  providers: [CategoryInferenceService],
  exports: [CategoryInferenceService]
})
export class CategoryInferenceModule {}
