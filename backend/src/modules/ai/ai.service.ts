import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ScoreLeadDto, DraftReplyDto, SummarizeThreadDto, MatchResumeDto } from './dto/ai.dto';

export enum AiModelTier {
  /**
   * Cost-optimized tier for everyday tasks (lead scoring, routing, quick reply drafting, sentiment)
   * Claude Haiku is ultra fast and maximizes cost savings on high volume inquiries.
   */
  HAIKU = 'claude-haiku-4-5-20251001',

  /**
   * High-intelligence tier for complex tasks (deep resume-role evaluation, thread summarization)
   * Claude Sonnet provides deep reasoning for candidate scoring & executive briefs.
   */
  SONNET = 'claude-sonnet-4-6',
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private anthropic: Anthropic | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('integrations.anthropicApiKey');
    if (apiKey && apiKey.startsWith('sk-ant-')) {
      this.anthropic = new Anthropic({ apiKey });
      this.logger.log('✅ Anthropic Claude API client initialized with cost-saving model tiering');
    } else {
      this.logger.warn('⚠️ Anthropic API key not provided or invalid. AI service running in fallback heuristic mode.');
    }
  }

  /**
   * Everyday Task (Claude Haiku): Score lead quality and route to the best department.
   */
  async scoreAndRouteLead(dto: ScoreLeadDto) {
    const systemPrompt = `You are a high-efficiency CRM AI assistant for Karya Saarthi (a premium digital services & technology company).
Analyze the incoming lead message. Output a strict JSON object with these keys:
{
  "qualityScore": number (0-100),
  "urgency": "HIGH" | "MEDIUM" | "LOW",
  "recommendedDepartment": "Web/Mobile Dev" | "Design & UI/UX" | "Career Inquiry" | "General Sales",
  "summary": string (1-2 sentences),
  "rationale": string
}
Keep it concise and realistic.`;

    const userPrompt = `Lead Message: "${dto.message}"
Service Requested: ${dto.serviceType || 'Not specified'}
Budget: ${dto.budget || 'Not specified'}`;

    if (!this.anthropic) {
      return this.fallbackLeadScoring(dto);
    }

    try {
      this.logger.log(`Invoking Claude Haiku (${AiModelTier.HAIKU}) for lead scoring...`);
      const response = await this.anthropic.messages.create({
        model: AiModelTier.HAIKU,
        max_tokens: 350,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      const text = textBlock ? textBlock.text : '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (err: any) {
      this.logger.error(`AI lead scoring failed: ${err.message}`, err.stack);
      return this.fallbackLeadScoring(dto);
    }
  }

  /**
   * Everyday Task (Claude Haiku): Draft canned reply / assistant response for inbox staff.
   */
  async draftReply(dto: DraftReplyDto) {
    const systemPrompt = `You are Karya Saarthi's senior customer success specialist.
Draft a professional, friendly, and solution-oriented reply to the client's message.
Tone requirement: ${dto.tone || 'professional, welcoming, and confident'}.
Keep the reply under 120 words. No placeholder text like [Your Name]. Sign off as 'Team Karya Saarthi'.`;

    const userPrompt = `Customer Message: "${dto.customerMessage}"
Conversation Context: ${dto.context || 'New interaction'}`;

    if (!this.anthropic) {
      return {
        modelTier: 'heuristic-fallback',
        draft: `Hello! Thank you for reaching out to Karya Saarthi. We have received your query regarding "${dto.customerMessage.slice(0, 40)}..." and our project team is reviewing your requirements. We will get back to you shortly with full details.\n\nWarm regards,\nTeam Karya Saarthi`,
      };
    }

    try {
      this.logger.log(`Invoking Claude Haiku (${AiModelTier.HAIKU}) for draft reply...`);
      const response = await this.anthropic.messages.create({
        model: AiModelTier.HAIKU,
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      return {
        modelTier: AiModelTier.HAIKU,
        draft: textBlock ? textBlock.text.trim() : '',
      };
    } catch (err: any) {
      this.logger.error(`AI draft reply failed: ${err.message}`);
      return {
        modelTier: 'heuristic-fallback',
        draft: `Hello! Thank you for reaching out to Karya Saarthi. We have received your message and our team will get in touch shortly.\n\nWarm regards,\nTeam Karya Saarthi`,
      };
    }
  }

  /**
   * Complex Task (Claude Sonnet): Summarize long threaded conversation for shift handoff.
   */
  async summarizeThread(dto: SummarizeThreadDto) {
    const systemPrompt = `You are an executive CRM analyst.
Synthesize the provided conversation thread into an actionable handoff brief for the incoming account manager.
Output a strict JSON object:
{
  "keyTopics": string[],
  "clientSentiment": "POSITIVE" | "NEUTRAL" | "AT_RISK" | "ESCALATED",
  "openActionItems": string[],
  "executiveSummary": string
}`;

    if (!this.anthropic) {
      return {
        keyTopics: ['Inquiry discussion', 'Project requirements'],
        clientSentiment: 'NEUTRAL',
        openActionItems: ['Follow up with customer regarding deliverables'],
        executiveSummary: 'Customer engaged in multi-turn discussion regarding requirements. Pending staff follow-up.',
        modelTier: 'heuristic-fallback',
      };
    }

    try {
      this.logger.log(`Invoking Claude Sonnet (${AiModelTier.SONNET}) for complex thread summarization...`);
      const response = await this.anthropic.messages.create({
        model: AiModelTier.SONNET,
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: dto.threadText }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      const text = textBlock ? textBlock.text : '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return { ...parsed, modelTier: AiModelTier.SONNET };
    } catch (err: any) {
      this.logger.error(`AI thread summarization failed: ${err.message}`);
      return {
        keyTopics: ['General inquiry'],
        clientSentiment: 'NEUTRAL',
        openActionItems: ['Review thread history'],
        executiveSummary: 'Automated fallback summary: Thread received and logged.',
        modelTier: 'heuristic-fallback',
      };
    }
  }

  /**
   * Complex Task (Claude Sonnet): Deep candidate resume-to-role matching & scorecard.
   */
  async matchResumeToJob(dto: MatchResumeDto) {
    const systemPrompt = `You are a technical recruitment evaluator for Karya Saarthi.
Evaluate the candidate's resume against the specified role.
Output a strict JSON object:
{
  "matchScore": number (0-100),
  "verdict": "STRONG_MATCH" | "POTENTIAL_MATCH" | "NOT_RECOMMENDED",
  "strengths": string[],
  "gaps": string[],
  "recommendedInterviewQuestions": string[],
  "summary": string
}`;

    const userPrompt = `Target Role: ${dto.jobTitle}
Requirements: ${dto.jobRequirements || 'Standard production engineering standards'}

Resume Content:
${dto.resumeText}`;

    if (!this.anthropic) {
      return {
        matchScore: 75,
        verdict: 'POTENTIAL_MATCH',
        strengths: ['Application submitted with relevant skills'],
        gaps: ['Manual screening recommended'],
        recommendedInterviewQuestions: ['Can you describe your experience with high-scale applications?'],
        summary: 'Resume received for role. Heuristic scoring applied.',
        modelTier: 'heuristic-fallback',
      };
    }

    try {
      this.logger.log(`Invoking Claude Sonnet (${AiModelTier.SONNET}) for deep resume evaluation...`);
      const response = await this.anthropic.messages.create({
        model: AiModelTier.SONNET,
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      const text = textBlock ? textBlock.text : '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return { ...parsed, modelTier: AiModelTier.SONNET };
    } catch (err: any) {
      this.logger.error(`AI resume matching failed: ${err.message}`);
      return {
        matchScore: 60,
        verdict: 'POTENTIAL_MATCH',
        strengths: ['Candidate profile recorded'],
        gaps: ['Requires human review'],
        recommendedInterviewQuestions: ['Discuss previous project responsibilities.'],
        summary: 'Resume logged in applicant tracking system.',
        modelTier: 'heuristic-fallback',
      };
    }
  }

  private fallbackLeadScoring(dto: ScoreLeadDto) {
    const text = (dto.message + ' ' + (dto.budget || '')).toLowerCase();
    let score = 50;
    let urgency: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

    if (text.includes('urgent') || text.includes('immediate') || text.includes('asap')) {
      urgency = 'HIGH';
      score += 20;
    }
    if (text.includes('budget') || text.includes('$') || text.includes('inr') || text.includes('₹') || text.includes('k')) {
      score += 15;
    }

    return {
      qualityScore: Math.min(score, 95),
      urgency,
      recommendedDepartment: dto.serviceType ? dto.serviceType : 'General Sales',
      summary: `Inquiry regarding ${dto.serviceType || 'services'} received.`,
      rationale: 'Heuristic evaluation based on keywords and budget presence.',
      modelTier: 'heuristic-fallback',
    };
  }
}
