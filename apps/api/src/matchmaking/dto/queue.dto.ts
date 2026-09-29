import { IsString, IsNotEmpty } from 'class-validator';

export class QueueDto {
  @IsString()
  @IsNotEmpty()
  tournamentId: string;
}
