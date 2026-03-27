import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpsertGlobalTemplateDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsIn(['weekly', 'monthly'])
  frequency!: 'weekly' | 'monthly';

  @IsIn(['standard', 'loot'])
  kind!: 'standard' | 'loot';

  @IsOptional()
  @IsString()
  @Length(2, 100)
  presetKey?: string | null;
}

export class TemplateItemUpsertDto {
  @IsString()
  @Length(1, 120)
  itemSlug!: string;

  @IsString()
  @Length(1, 200)
  itemName!: string;

  @IsString()
  @Length(1, 300)
  spritePath!: string;

  @IsOptional()
  @IsBoolean()
  isRare?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  npcPriceDollars?: number | null;
}

export class ReplaceTemplateItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateItemUpsertDto)
  items!: TemplateItemUpsertDto[];
}

