import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateBlogPostDto,
  UpdateBlogPostDto,
  CreateCaseStudyDto,
  UpdateCaseStudyDto,
  CreateTestimonialDto,
  UpdateTestimonialDto,
  QueryContentDto,
} from './dto/content.dto';
import { Surface, Prisma } from '@prisma/client';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ==========================================
  // BLOG POSTS
  // ==========================================

  async createBlogPost(authorId: string | null, dto: CreateBlogPostDto) {
    const slug = dto.slug ? this.slugify(dto.slug) : `${this.slugify(dto.title)}-${Date.now().toString(36)}`;
    
    // Check slug collision
    const existing = await this.prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Blog post with slug '${slug}' already exists`);
    }

    const isPublished = !!dto.published;

    return this.prisma.blogPost.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        content: dto.content,
        coverImage: dto.coverImage,
        tags: dto.tags || [],
        surface: dto.surface || Surface.SITE_COM,
        published: isPublished,
        publishedAt: isPublished ? new Date() : null,
        authorId: authorId || undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async updateBlogPost(id: string, dto: UpdateBlogPostDto) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Blog post with ID '${id}' not found`);
    }

    let slug = post.slug;
    if (dto.slug && dto.slug !== post.slug) {
      slug = this.slugify(dto.slug);
      const conflict = await this.prisma.blogPost.findUnique({ where: { slug } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Blog post with slug '${slug}' already exists`);
      }
    }

    let publishedAt = post.publishedAt;
    if (dto.published === true && !post.published) {
      publishedAt = new Date();
    } else if (dto.published === false) {
      publishedAt = null;
    }

    return this.prisma.blogPost.update({
      where: { id },
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        content: dto.content,
        coverImage: dto.coverImage,
        tags: dto.tags,
        surface: dto.surface,
        published: dto.published,
        publishedAt,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async deleteBlogPost(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Blog post with ID '${id}' not found`);
    }
    await this.prisma.blogPost.delete({ where: { id } });
    return { success: true, message: `Blog post '${post.title}' deleted successfully` };
  }

  async getBlogPostBySlug(slug: string, incrementView = true) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Blog post with slug '${slug}' not found`);
    }

    if (incrementView) {
      await this.prisma.blogPost.update({
        where: { id: post.id },
        data: { viewsCount: { increment: 1 } },
      });
      post.viewsCount += 1;
    }

    return post;
  }

  async listBlogPosts(query: QueryContentDto, isStaff = false) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostWhereInput = {};

    if (!isStaff) {
      where.published = true;
    } else if (query.published !== undefined) {
      where.published = query.published;
    }

    if (query.surface) {
      where.surface = query.surface;
    }

    if (query.tag) {
      where.tags = { has: query.tag };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // CASE STUDIES
  // ==========================================

  async createCaseStudy(dto: CreateCaseStudyDto) {
    const slug = dto.slug ? this.slugify(dto.slug) : `${this.slugify(dto.title)}-${Date.now().toString(36)}`;

    const existing = await this.prisma.caseStudy.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Case study with slug '${slug}' already exists`);
    }

    return this.prisma.caseStudy.create({
      data: {
        title: dto.title,
        slug,
        clientName: dto.clientName,
        serviceType: dto.serviceType,
        description: dto.description,
        outcomeMetrics: dto.outcomeMetrics || {},
        coverImage: dto.coverImage,
        tags: dto.tags || [],
        published: !!dto.published,
      },
    });
  }

  async updateCaseStudy(id: string, dto: UpdateCaseStudyDto) {
    const study = await this.prisma.caseStudy.findUnique({ where: { id } });
    if (!study) {
      throw new NotFoundException(`Case study with ID '${id}' not found`);
    }

    let slug = study.slug;
    if (dto.slug && dto.slug !== study.slug) {
      slug = this.slugify(dto.slug);
      const conflict = await this.prisma.caseStudy.findUnique({ where: { slug } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Case study with slug '${slug}' already exists`);
      }
    }

    return this.prisma.caseStudy.update({
      where: { id },
      data: {
        title: dto.title,
        slug,
        clientName: dto.clientName,
        serviceType: dto.serviceType,
        description: dto.description,
        outcomeMetrics: dto.outcomeMetrics,
        coverImage: dto.coverImage,
        tags: dto.tags,
        published: dto.published,
      },
    });
  }

  async deleteCaseStudy(id: string) {
    const study = await this.prisma.caseStudy.findUnique({ where: { id } });
    if (!study) {
      throw new NotFoundException(`Case study with ID '${id}' not found`);
    }
    await this.prisma.caseStudy.delete({ where: { id } });
    return { success: true, message: `Case study '${study.title}' deleted successfully` };
  }

  async getCaseStudyBySlug(slug: string) {
    const study = await this.prisma.caseStudy.findUnique({
      where: { slug },
    });
    if (!study) {
      throw new NotFoundException(`Case study with slug '${slug}' not found`);
    }
    return study;
  }

  async listCaseStudies(query: QueryContentDto, isStaff = false) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.CaseStudyWhereInput = {};

    if (!isStaff) {
      where.published = true;
    } else if (query.published !== undefined) {
      where.published = query.published;
    }

    if (query.tag) {
      where.tags = { has: query.tag };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { clientName: { contains: query.search, mode: 'insensitive' } },
        { serviceType: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.caseStudy.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.caseStudy.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // TESTIMONIALS
  // ==========================================

  async createTestimonial(dto: CreateTestimonialDto) {
    return this.prisma.testimonial.create({
      data: {
        clientName: dto.clientName,
        clientRole: dto.clientRole,
        company: dto.company,
        avatarUrl: dto.avatarUrl,
        rating: dto.rating ?? 5,
        reviewText: dto.reviewText,
        verified: dto.verified ?? true,
        surface: dto.surface || Surface.SITE_COM,
      },
    });
  }

  async updateTestimonial(id: string, dto: UpdateTestimonialDto) {
    const testimonial = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!testimonial) {
      throw new NotFoundException(`Testimonial with ID '${id}' not found`);
    }

    return this.prisma.testimonial.update({
      where: { id },
      data: {
        clientName: dto.clientName,
        clientRole: dto.clientRole,
        company: dto.company,
        avatarUrl: dto.avatarUrl,
        rating: dto.rating,
        reviewText: dto.reviewText,
        verified: dto.verified,
        surface: dto.surface,
      },
    });
  }

  async deleteTestimonial(id: string) {
    const testimonial = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!testimonial) {
      throw new NotFoundException(`Testimonial with ID '${id}' not found`);
    }
    await this.prisma.testimonial.delete({ where: { id } });
    return { success: true, message: `Testimonial from '${testimonial.clientName}' deleted successfully` };
  }

  async listTestimonials(surface?: Surface, verifiedOnly = false) {
    const where: Prisma.TestimonialWhereInput = {};
    if (surface) {
      where.surface = surface;
    }
    if (verifiedOnly) {
      where.verified = true;
    }

    return this.prisma.testimonial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
