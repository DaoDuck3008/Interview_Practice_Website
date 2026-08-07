import { Module } from '@nestjs/common';
import { MockCvAnalysisModule } from './analysis/mock-cv-analysis.module';
import { MockCvInterviewsModule } from './interviews/mock-cv-interviews.module';
import { MockCvsModule } from './start/mock-cvs.module';

/**
 * Feature root của Mock CV: gom upload/phân tích, khởi tạo bài và phòng phỏng vấn
 * dưới một đầu mối để AppModule không phải biết cấu trúc nội bộ của feature.
 */
@Module({
  imports: [MockCvAnalysisModule, MockCvsModule, MockCvInterviewsModule],
})
export class MockCvModule {}
