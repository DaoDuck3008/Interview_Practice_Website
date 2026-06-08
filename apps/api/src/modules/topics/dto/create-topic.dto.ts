import { IsString, Matches } from 'class-validator';

export class CreateTopicDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug chỉ gồm chữ thường, số và dấu gạch ngang',
  })
  slug: string;

  @IsString()
  name: string;
}
