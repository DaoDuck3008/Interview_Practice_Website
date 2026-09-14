import { CreateExplanationDto } from './dto/create-explanation.dto';

export const EXPLANATION_JOBS_QUEUE = 'explanation-jobs';
export const JOB_GENERATE_TECHNICAL_TERM = 'generate-technical-term';

export interface GenerateTechnicalTermJob {
  termId: string;
  userId: string;
  dto: CreateExplanationDto;
}
