import { IsArray, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsIn(['weekly', 'monthly'])
  frequency!: 'weekly' | 'monthly';
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsIn(['weekly', 'monthly'])
  frequency?: 'weekly' | 'monthly';
}

export class SetCharTemplatesDto {
  @IsArray()
  @IsString({ each: true })
  templateIds!: string[];
}
