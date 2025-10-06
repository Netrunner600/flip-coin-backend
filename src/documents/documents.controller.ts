// src/documents/documents.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Delete,
  UploadedFiles,
  UseInterceptors,
  Body,
  HttpCode,
  Res,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { multerConfig } from '../config/multer.config';
import type { Response as ExpressResponse } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import type { Document as DocumentModel } from './entity/documents.model';

@Controller('documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(private readonly documentsService: DocumentsService) {}

  // MULTI-file upload (frontend should send field name 'files')
  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 50, multerConfig)) // up to 50 files in one request
  async uploadDocuments(
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Body('title') title?: string,
  ) {
    this.logger.debug(
      'Upload endpoint called, files:',
      (files || []).map((f) => ({ originalname: f.originalname, mimetype: f.mimetype, filename: f.filename })),
    );

    const created: Array<{ id: number; name: string; url: string; type: string; uploadedAt: Date }> = [];

    for (const f of files || []) {
      const doc: DocumentModel = await this.documentsService.createDocument(title || f.originalname || f.filename, f);
      created.push({
        id: (doc as any).id,
        name: (doc as any).name,
        url: (doc as any).location,
        type: (doc as any).type,
        uploadedAt: (doc as any).createdAt,
      });
    }
    return created;
  }


  @Delete(':id')
async deleteDocument(@Param('id', ParseIntPipe) id: number) {
  const result = await this.documentsService.deleteDocument(id);
  // result = { id, removedFile }
  return { success: true, ...result };
}
  // Keep single-file upload route if you still need it:
  @Post('upload/single')
  @UseInterceptors(FilesInterceptor('file', 1, multerConfig))
  async uploadSingle(@UploadedFiles() files: Express.Multer.File[] = [], @Body('title') title?: string) {
    const f = files?.[0];
    if (!f) return [];
    const doc = await this.documentsService.createDocument(title || f.originalname || f.filename, f);
    return {
      id: (doc as any).id,
      name: (doc as any).name,
      url: (doc as any).location,
      type: (doc as any).type,
      uploadedAt: (doc as any).createdAt,
    };
  }

  @Get()
  async getDocuments() {
    return this.documentsService.getAllDocuments();
  }

  @Get(':id')
  async getDocument(@Param('id') id: number) {
    return this.documentsService.getDocumentById(Number(id));
  }

  // Download endpoint: skip throttle (recommended) since this serves files
  @Post('download')
  @HttpCode(200)
  @SkipThrottle()
  async download(@Body('path') relativePath: string, @Res() res: ExpressResponse) {
    await this.documentsService.downloadFile(res, relativePath);
  }
}
