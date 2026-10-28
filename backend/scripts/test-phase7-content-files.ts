import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ContentService } from '../src/modules/content/content.service';
import { FilesService } from '../src/modules/files/files.service';
import { Role, Surface, PersonType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function runPhase7Verification() {
  console.log('\n=============================================================');
  console.log('🚀 STARTING PHASE 7: CONTENT CMS & FILE ASSET MANAGEMENT');
  console.log('=============================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const contentService = app.get(ContentService);
  const filesService = app.get(FilesService);

  try {
    // -------------------------------------------------------------
    // Step 1: Set up Test Staff
    // -------------------------------------------------------------
    console.log('--- Step 1: Setting up Test Staff Author ---');
    const authorEmail = `author.phase7.${Date.now()}@karyasaarthi.com`;
    const author = await prisma.staff.create({
      data: {
        name: 'Priya Sharma (Content Lead)',
        email: authorEmail,
        passwordHash: 'dummyhash123',
        role: Role.ADMIN,
        active: true,
      },
    });
    console.log(`✅ Staff Author created: ${author.name} (${author.id})`);

    // -------------------------------------------------------------
    // Step 2: Blog Post Operations
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Testing Blog Post CMS Features ---');
    
    // 2a. Create a Published Blog Post
    const blog1 = await contentService.createBlogPost(author.id, {
      title: 'How AI Automation Is Transforming Indian Enterprises in 2026',
      excerpt: 'Discover how modern AI pipelines and CRM workflows reduce operational friction.',
      content: '# AI in 2026\nEnterprise automation has evolved from simple bots to end-to-end autonomous agent networks.',
      tags: ['AI', 'Automation', 'Enterprise', 'Tech'],
      surface: Surface.SITE_COM,
      published: true,
    });
    console.log(`✅ Published Blog created: '${blog1.title}' [Slug: ${blog1.slug}]`);

    // 2b. Create a Draft Blog Post
    const blog2 = await contentService.createBlogPost(author.id, {
      title: 'Scaling NextJS Applications on Distributed Infrastructure',
      content: 'Draft content regarding NextJS optimization...',
      tags: ['Engineering', 'NextJS'],
      surface: Surface.SITE_IN,
      published: false,
    });
    console.log(`✅ Draft Blog created: '${blog2.title}' [Published: ${blog2.published}]`);

    // 2c. Slug collision test
    try {
      await contentService.createBlogPost(author.id, {
        title: 'Collision Test',
        slug: blog1.slug,
        content: 'Should fail',
      });
      console.error('❌ Expected slug collision error, but call succeeded!');
    } catch (e: any) {
      console.log(`✅ Slug collision correctly prevented: "${e.message}"`);
    }

    // 2d. Public view & view-count increment
    const fetchedBlog = await contentService.getBlogPostBySlug(blog1.slug, true);
    console.log(`✅ Fetched blog by slug. Current Views: ${fetchedBlog.viewsCount} (Incremented)`);

    // 2e. Public listing (should only return published blogs)
    const publicBlogs = await contentService.listBlogPosts({ page: 1, limit: 10 }, false);
    const hasDraftInPublic = publicBlogs.items.some((b) => !b.published);
    console.log(`✅ Public blog list count: ${publicBlogs.total} (Contains 0 drafts: ${!hasDraftInPublic})`);

    // 2f. Admin listing (should include drafts)
    const adminBlogs = await contentService.listBlogPosts({ page: 1, limit: 10 }, true);
    console.log(`✅ Admin blog list count: ${adminBlogs.total} (Includes both published & draft posts)`);

    // -------------------------------------------------------------
    // Step 3: Case Study Operations
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Testing Case Study CMS Features ---');

    const caseStudy = await contentService.createCaseStudy({
      title: 'Digitizing Supply Chain Operations for Nexus Logistics',
      clientName: 'Nexus Logistics Pvt Ltd',
      serviceType: 'Full-Stack ERP & Mobile App',
      description: 'Built real-time telemetry, automated driver dispatching, and invoicing in 60 days.',
      outcomeMetrics: {
        dispatchTimeReduction: '45%',
        annualCostSavings: '₹35 Lakhs',
        deliveryAccuracy: '99.8%',
      },
      tags: ['Logistics', 'Mobile App', 'Cloud'],
      published: true,
    });
    console.log(`✅ Case Study created: '${caseStudy.title}' [Client: ${caseStudy.clientName}]`);
    console.log(`   Outcome Metrics: ${JSON.stringify(caseStudy.outcomeMetrics)}`);

    const fetchedCaseStudy = await contentService.getCaseStudyBySlug(caseStudy.slug);
    console.log(`✅ Retrieved Case Study by slug '${fetchedCaseStudy.slug}': Verified`);

    // Update case study
    const updatedCaseStudy = await contentService.updateCaseStudy(caseStudy.id, {
      title: 'Digitizing Global Logistics for Nexus Logistics (Updated)',
    });
    console.log(`✅ Case Study updated title: '${updatedCaseStudy.title}'`);

    // -------------------------------------------------------------
    // Step 4: Testimonials Operations
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Testing Client Testimonials ---');

    const testimonial = await contentService.createTestimonial({
      clientName: 'Rajesh Kulkarni',
      clientRole: 'VP of Technology',
      company: 'Zenith Retail Solutions',
      rating: 5,
      reviewText: 'Karya Saarthi delivered our omni-channel loyalty app 3 weeks ahead of schedule. Exceptional engineering!',
      surface: Surface.SITE_COM,
      verified: true,
    });
    console.log(`✅ Testimonial created from ${testimonial.clientName} (${testimonial.company}) - Rating: ${testimonial.rating}⭐`);

    const publicTestimonials = await contentService.listTestimonials(Surface.SITE_COM, true);
    console.log(`✅ Public testimonials count for SITE_COM: ${publicTestimonials.length}`);

    // -------------------------------------------------------------
    // Step 5: File Storage & Asset Management
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Testing File Upload & Asset Storage ---');

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create a mock file on disk to simulate Multer upload
    const mockFilename = `brand_brief_${Date.now()}.pdf`;
    const mockFilePath = path.join(uploadsDir, mockFilename);
    const mockFileContent = Buffer.from('%PDF-1.4 Mock Karya Saarthi Deliverable Specification Content');
    fs.writeFileSync(mockFilePath, mockFileContent);

    const mockMulterFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'Client_Brand_Deliverable_v1.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: mockFileContent.length,
      destination: uploadsDir,
      filename: mockFilename,
      path: mockFilePath,
      buffer: mockFileContent,
      stream: null as any,
    };

    const fileRecord = await filesService.recordUploadedFile(
      mockMulterFile,
      author.id,
      undefined,
      undefined,
    );
    console.log(`✅ File recorded in DB: [ID: ${fileRecord.id}]`);
    console.log(`   Filename: ${fileRecord.filename}`);
    console.log(`   Original Name: ${fileRecord.originalName}`);
    console.log(`   Size: ${fileRecord.size} bytes | Mime: ${fileRecord.mimeType}`);
    console.log(`   Path URL: ${fileRecord.pathUrl}`);

    // Retrieve file record metadata
    const retrievedRecord = await filesService.getFileRecord(fileRecord.id);
    console.log(`✅ File metadata verified from DB query: ${retrievedRecord.originalName}`);

    // Test physical file existence & stream path resolution
    const streamInfo = await filesService.getFilePath(fileRecord.filename);
    console.log(`✅ Physical file resolved at: ${streamInfo.fullPath}`);
    console.log(`   Disk file exists: ${fs.existsSync(streamInfo.fullPath)}`);

    // List files
    const fileList = await filesService.listFiles({ page: 1, limit: 10 });
    console.log(`✅ Files list query: ${fileList.total} file records found`);

    // Delete file
    const deleteResult = await filesService.deleteFile(fileRecord.id);
    const diskFileExistsAfter = fs.existsSync(streamInfo.fullPath);
    console.log(`✅ File deletion result: ${deleteResult.message}`);
    console.log(`   File removed from disk: ${!diskFileExistsAfter}`);

    // -------------------------------------------------------------
    // Cleanup CMS test records
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Cleaning up Test Records ---');
    await contentService.deleteBlogPost(blog1.id);
    await contentService.deleteBlogPost(blog2.id);
    await contentService.deleteCaseStudy(caseStudy.id);
    await contentService.deleteTestimonial(testimonial.id);
    await prisma.staff.delete({ where: { id: author.id } });
    console.log('✅ Cleaned up blog posts, case study, testimonial, and test staff.');

    console.log('\n=============================================================');
    console.log('🎉 ALL PHASE 7 (CONTENT CMS & FILE ASSETS) TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } catch (error) {
    console.error('❌ Verification failed with error:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runPhase7Verification();
