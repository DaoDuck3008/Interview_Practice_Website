import { InternalServerErrorException } from '@nestjs/common';
import type { DeepSeekClient } from '../ai/clients/deepseek.client';
import { MockCvInterviewOverviewService } from './mock-cv-interview-overview.service';

const INPUT = {
  targetRole: 'Backend Developer',
  profileSummary: 'Ứng viên có kinh nghiệm Node.js.',
  claimsToVerify: ['Tối ưu API chịu tải cao'],
  questionScores: [],
};

/** Kiểm tra parse, normalization và retry schema của overview mà không gọi DeepSeek thật. */
describe('MockCvInterviewOverviewService', () => {
  it('chuẩn hóa output hợp lệ và bỏ phần tử rỗng', async () => {
    const deepseek = {
      call: jest.fn().mockResolvedValue(
        JSON.stringify({
          readiness: 'READY',
          summary: '  Sẵn sàng phỏng vấn.  ',
          strengths: [' Node.js ', ''],
          weaknesses: ['Thiếu ví dụ tải cao'],
          claimsToPrepareEvidence: ['Chuẩn bị số liệu latency'],
          nextRecommendations: ['Ôn system design'],
        }),
      ),
    };
    const service = new MockCvInterviewOverviewService(
      deepseek as unknown as DeepSeekClient,
    );

    await expect(service.generate(INPUT)).resolves.toEqual({
      readiness: 'READY',
      summary: 'Sẵn sàng phỏng vấn.',
      strengths: ['Node.js'],
      weaknesses: ['Thiếu ví dụ tải cao'],
      claimsToPrepareEvidence: ['Chuẩn bị số liệu latency'],
      nextRecommendations: ['Ôn system design'],
    });
  });

  it('gọi lại một lần khi response đầu sai schema', async () => {
    const deepseek = {
      call: jest
        .fn()
        .mockResolvedValueOnce('{"readiness":"UNKNOWN"}')
        .mockResolvedValueOnce(
          JSON.stringify({
            readiness: 'NEEDS_PRACTICE',
            summary: 'Cần luyện thêm.',
            strengths: [],
            weaknesses: [],
            claimsToPrepareEvidence: [],
            nextRecommendations: [],
          }),
        ),
    };
    const service = new MockCvInterviewOverviewService(
      deepseek as unknown as DeepSeekClient,
    );

    await expect(service.generate(INPUT)).resolves.toMatchObject({
      readiness: 'NEEDS_PRACTICE',
    });
    expect(deepseek.call).toHaveBeenCalledTimes(2);
  });

  it('ném lỗi sau hai response sai schema', async () => {
    const deepseek = { call: jest.fn().mockResolvedValue('{}') };
    const service = new MockCvInterviewOverviewService(
      deepseek as unknown as DeepSeekClient,
    );

    await expect(service.generate(INPUT)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(deepseek.call).toHaveBeenCalledTimes(2);
  });
});
