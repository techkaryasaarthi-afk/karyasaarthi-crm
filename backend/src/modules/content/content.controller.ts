import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role, Surface } from '@prisma/client';
import { ContentService } from './content.service';
import {
  CreateBlogPostDto,
  UpdateBlogPostDto,
  CreateCaseStudyDto,
  UpdateCaseStudyDto,
  CreateTestimonialDto,
  UpdateTestimonialDto,
  QueryContentDto,
} from './dto/content.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Content CMS (Blogs, Case Studies, Testimonials)')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // ==========================================
  // BLOG POSTS
  // ==========================================

  @Public()
  @Get('blogs')
  @ApiOperation({ summary: 'Public list of published blog posts' })
  @ApiResponse({ status: 200, description: 'Paginated list of blog articles' })
  findPublishedBlogs(@Query() query: QueryContentDto) {
    return this.contentService.listBlogPosts(query, false);
  }

  @Get('admin/blogs')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin/Manager list of all blog posts (including drafts)' })
  findAllBlogsAdmin(@Query() query: QueryContentDto) {
    return this.contentService.listBlogPosts(query, true);
  }

  @Public()
  @Get('blogs/:slug')
  @ApiOperation({ summary: 'Public single blog post by slug (increments view count)' })
  @ApiResponse({ status: 200, description: 'Blog post details' })
  findBlogBySlug(@Param('slug') slug: string) {
    return this.contentService.getBlogPostBySlug(slug, true);
  }

  @Post('blogs')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a new blog post' })
  createBlogPost(@Body() dto: CreateBlogPostDto, @Req() req: any) {
    const authorId = req.user?.id || null;
    return this.contentService.createBlogPost(authorId, dto);
  }

  @Patch('blogs/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update an existing blog post' })
  updateBlogPost(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.contentService.updateBlogPost(id, dto);
  }

  @Delete('blogs/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a blog post' })
  deleteBlogPost(@Param('id') id: string) {
    return this.contentService.deleteBlogPost(id);
  }

  // ==========================================
  // CASE STUDIES
  // ==========================================

  @Public()
  @Get('case-studies')
  @ApiOperation({ summary: 'Public list of published case studies' })
  findPublishedCaseStudies(@Query() query: QueryContentDto) {
    return this.contentService.listCaseStudies(query, false);
  }

  @Get('admin/case-studies')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin/Manager list of all case studies (including drafts)' })
  findAllCaseStudiesAdmin(@Query() query: QueryContentDto) {
    return this.contentService.listCaseStudies(query, true);
  }

  @Public()
  @Get('case-studies/:slug')
  @ApiOperation({ summary: 'Public single case study by slug' })
  findCaseStudyBySlug(@Param('slug') slug: string) {
    return this.contentService.getCaseStudyBySlug(slug);
  }

  @Post('case-studies')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a new case study' })
  createCaseStudy(@Body() dto: CreateCaseStudyDto) {
    return this.contentService.createCaseStudy(dto);
  }

  @Patch('case-studies/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update an existing case study' })
  updateCaseStudy(@Param('id') id: string, @Body() dto: UpdateCaseStudyDto) {
    return this.contentService.updateCaseStudy(id, dto);
  }

  @Delete('case-studies/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a case study' })
  deleteCaseStudy(@Param('id') id: string) {
    return this.contentService.deleteCaseStudy(id);
  }

  // ==========================================
  // TESTIMONIALS
  // ==========================================

  @Public()
  @Get('testimonials')
  @ApiOperation({ summary: 'Public list of verified testimonials' })
  findPublishedTestimonials(@Query('surface') surface?: Surface) {
    return this.contentService.listTestimonials(surface, true);
  }

  @Get('admin/testimonials')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin/Manager list of all testimonials' })
  findAllTestimonialsAdmin(@Query('surface') surface?: Surface) {
    return this.contentService.listTestimonials(surface, false);
  }

  @Post('testimonials')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a testimonial' })
  createTestimonial(@Body() dto: CreateTestimonialDto) {
    return this.contentService.createTestimonial(dto);
  }

  @Patch('testimonials/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update a testimonial' })
  updateTestimonial(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) {
    return this.contentService.updateTestimonial(id, dto);
  }

  @Delete('testimonials/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a testimonial' })
  deleteTestimonial(@Param('id') id: string) {
    return this.contentService.deleteTestimonial(id);
  }
}
