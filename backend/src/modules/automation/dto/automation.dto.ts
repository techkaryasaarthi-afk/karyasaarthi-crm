import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TriggerAutomationDto {
  @ApiPropertyOptional({
    description: 'Specific automation trigger type or ALL',
    default: 'ALL',
    enum: ['ALL', 'SLA_CHECK', 'STALE_LEADS', 'OVERDUE_INVOICES'],
  })
  @IsOptional()
  @IsString()
  triggerType?: string;
}
