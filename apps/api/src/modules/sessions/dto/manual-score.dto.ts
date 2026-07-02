import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Admin chấm lại điểm + nhận xét thủ công (ghi đè kết quả AI) khi 1 report được xác nhận là đúng. */
export class ManualScoreDto {
  @IsInt()
  @Min(0)
  @Max(10)
  technicalScore: number;

  @IsInt()
  @Min(0)
  @Max(10)
  completenessScore: number;

  @IsInt()
  @Min(0)
  @Max(10)
  clarityScore: number;

  @IsString()
  @IsNotEmpty({ message: 'Nhận xét không được để trống' })
  @MaxLength(1000)
  summary: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  improvements: string[];
}
