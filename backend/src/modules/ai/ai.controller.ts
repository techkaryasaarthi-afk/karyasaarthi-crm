import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AiService } from './ai.service';
import { ScoreLeadDto, DraftReplyDto, SummarizeThreadDto, MatchResumeDto } from './dto/ai.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('AI Assist Layer')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('score-lead')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({
    summary: 'Score lead intent & urgency using Claude Haiku (Cost-Optimized)',
    description: 'Uses low-cost Claude 3.5 Haiku to score incoming leads and recommend sales routing.',
  })
  @ApiResponse({ status: 200, description: 'Lead score and routing classification' })
  scoreLead(@Body() dto: ScoreLeadDto) {
    return this.aiService.scoreAndRouteLead(dto);
  }

  @Post('draft-reply')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({
    summary: 'Draft suggested response using Claude Haiku (Cost-Optimized)',
    description: 'Generates context-aware, fast reply suggestions for agents in the inbox.',
  })
  @ApiResponse({ status: 200, description: 'Draft reply proposal' })
  draftReply(@Body() dto: DraftReplyDto) {
    return this.aiService.draftReply(dto);
  }

  @Post('summarize-thread')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({
    summary: 'Synthesize multi-turn conversation using Claude Sonnet (High Intelligence)',
    description: 'Uses Claude Sonnet to generate an executive handoff brief and sentiment flag for complex threads.',
  })
  @ApiResponse({ status: 200, description: 'Thread synthesis and sentiment diagnosis' })
  summarizeThread(@Body() dto: SummarizeThreadDto) {
    return this.aiService.summarizeThread(dto);
  }

  @Post('match-resume')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Deep resume evaluation using Claude Sonnet (High Intelligence)',
    description: 'Uses Claude Sonnet to perform structured resume-to-job matching, strengths/gaps analysis, and candidate scorecards.',
  })
  @ApiResponse({ status: 200, description: 'Candidate match scorecard' })
  matchResume(@Body() dto: MatchResumeDto) {
    return this.aiService.matchResumeToJob(dto);
  }
}
