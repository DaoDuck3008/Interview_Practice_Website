import { IsString, Matches } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'planSlug không hợp lệ' })
  planSlug: string;
}
