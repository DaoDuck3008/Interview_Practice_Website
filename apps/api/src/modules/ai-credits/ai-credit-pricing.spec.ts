import { AiCreditFeature } from '@prisma/client';
import {
  AI_CREDIT_PRICING,
  aiCreditReservationKey,
  cvAnalysisFeature,
  getAiCreditCost,
} from './ai-credit-pricing';

describe('AI credit pricing', () => {
  it.each([
    [10, AiCreditFeature.CV_ANALYSIS_10, 8],
    [20, AiCreditFeature.CV_ANALYSIS_20, 12],
    [30, AiCreditFeature.CV_ANALYSIS_30, 16],
  ])('map %i câu sang đúng feature và cost', (count, feature, cost) => {
    expect(cvAnalysisFeature(count)).toBe(feature);
    expect(getAiCreditCost(feature)).toBe(cost);
  });

  it('có giá cho mọi feature trong Prisma enum', () => {
    expect(Object.keys(AI_CREDIT_PRICING).sort()).toEqual(
      Object.values(AiCreditFeature).sort(),
    );
  });

  it('tạo idempotency key có namespace theo feature và reference', () => {
    expect(
      aiCreditReservationKey(
        AiCreditFeature.ANSWER_AUDIO,
        'SESSION',
        'session-1',
      ),
    ).toBe('ANSWER_AUDIO:SESSION:session-1');
  });
});
