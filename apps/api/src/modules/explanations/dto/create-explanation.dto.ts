import {
  IsEnum,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum ExplanationSource {
  QUESTION = 'QUESTION',
  SUMMARY = 'SUMMARY',
  DETAIL_ANSWER = 'DETAIL_ANSWER',
  KEYWORD = 'KEYWORD',
}

export class CreateExplanationDto {
  @IsUUID() questionId: string;
  @IsEnum(ExplanationSource) source: ExplanationSource;
  @IsString() @MinLength(2) @MaxLength(60) selectedText: string;
}
