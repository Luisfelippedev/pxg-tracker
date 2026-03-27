import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

export class TaskLootLineDto {
  @IsString()
  slug!: string;

  @IsInt()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  npcUnitPriceDollars!: number;
}

export class UpdateTaskStatusDto {
  @IsBoolean()
  done!: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskLootLineDto)
  loot?: TaskLootLineDto[] | null;
}

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
