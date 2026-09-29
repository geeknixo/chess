import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum TournamentStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED'
}

export class UpdateTournamentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(TournamentStatus)
  @IsOptional()
  status?: TournamentStatus;
  
  @IsDateString()
  @IsOptional()
  startedAt?: string;
}
