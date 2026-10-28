import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueryFilesDto } from './dto/file.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async recordUploadedFile(
    file: Express.Multer.File,
    uploadedBy?: string,
    projectId?: string,
    deliverableId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const pathUrl = `/uploads/${file.filename}`;

    const record = await this.prisma.fileRecord.create({
      data: {
        originalName: file.originalname,
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        pathUrl,
        storageType: 'LOCAL',
        uploadedBy: uploadedBy || null,
        projectId: projectId || null,
        deliverableId: deliverableId || null,
      },
    });

    return record;
  }

  async getFileRecord(id: string) {
    const record = await this.prisma.fileRecord.findFirst({
      where: {
        OR: [{ id }, { filename: id }],
      },
      include: {
        project: {
          select: { id: true, title: true, client: { select: { id: true, fullName: true } } },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`File record '${id}' not found`);
    }

    return record;
  }

  async getFilePath(filename: string): Promise<{ fullPath: string; record: any }> {
    const record = await this.getFileRecord(filename);
    const fullPath = path.join(this.uploadDir, record.filename);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`Physical file '${record.filename}' not found on disk`);
    }

    return { fullPath, record };
  }

  async listFiles(query: QueryFilesDto) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.projectId) {
      where.projectId = query.projectId;
    }
    if (query.deliverableId) {
      where.deliverableId = query.deliverableId;
    }

    const [items, total] = await Promise.all([
      this.prisma.fileRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.fileRecord.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteFile(id: string) {
    const record = await this.getFileRecord(id);
    const fullPath = path.join(this.uploadDir, record.filename);

    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.warn(`Could not delete file from disk: ${fullPath}`, err);
      }
    }

    await this.prisma.fileRecord.delete({ where: { id: record.id } });
    return { success: true, message: `File '${record.originalName}' deleted successfully` };
  }
}
