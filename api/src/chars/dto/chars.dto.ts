import { IsString, Length } from 'class-validator';

export class CreateCharDto {
  @IsString()
  @Length(2, 40)
  name!: string;
}

export class UpdateCharDto {
  @IsString()
  @Length(2, 40)
  name!: string;
}
