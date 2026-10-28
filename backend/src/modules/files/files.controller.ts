import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  Body,
  Res,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { QueryFilesDto } from './dto/file.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

const uploadsDirectory = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
}

const multerStorage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDirectory);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^\w-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

@ApiTags('File Storage & Asset Management')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload an asset or deliverable file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        projectId: { type: 'string', nullable: true },
        deliverableId: { type: 'string', nullable: true },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage,
      limits: {
        fileSize: 25 * 1024 * 1024, // 25 MB max limit
      },
    }),
  )
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('projectId') projectId?: string,
    @Body('deliverableId') deliverableId?: string,
    @Req() req?: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required in multipart form data under key "file"');
    }
    const uploadedBy = req?.user?.id || null;
    return this.filesService.recordUploadedFile(file, uploadedBy, projectId, deliverableId);
  }

  @Get()
  @ApiOperation({ summary: 'List uploaded file records with pagination' })
  listFiles(@Query() query: QueryFilesDto) {
    return this.filesService.listFiles(query);
  }

  @Get('info/:id')
  @ApiOperation({ summary: 'Get file record metadata' })
  getFileInfo(@Param('id') id: string) {
    return this.filesService.getFileRecord(id);
  }

  @Public()
  @Get('download/:filename')
  @ApiOperation({ summary: 'Download or stream physical file' })
  async downloadFile(@Param('filename') filename: string, @Res() res: Response) {
    const { fullPath, record } = await this.filesService.getFilePath(filename);
    res.setHeader('Content-Type', record.mimeType);
    return res.download(fullPath, record.originalName);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file and its database record' })
  deleteFile(@Param('id') id: string) {
    return this.filesService.deleteFile(id);
  }
}
