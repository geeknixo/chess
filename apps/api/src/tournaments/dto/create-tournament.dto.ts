import { IsString, IsInt, Min, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class CreateTournamentDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  timeControlInitialMinutes: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  timeControlIncrementSeconds?: number;

  @IsDateString()
  @IsOptional()
  startedAt?: string;
}
