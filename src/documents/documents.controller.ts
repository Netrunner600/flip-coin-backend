// src/documents/documents.controller.ts
import { Controller, Post, Get, Param, UploadedFile, UseInterceptors, Body, HttpCode, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { multerConfig } from '../config/multer.config';
import { CreateDocumentDto } from './create-document.dto';
import type { Response as ExpressResponse } from 'express';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
  ) {
    console.log('Uploaded file:', file);

    // Save to DB
    const document = await this.documentsService.createDocument(
      title,
      file, 
    );

    return document;
  }


  @Get()
  async getDocuments() {
    return this.documentsService.getAllDocuments();
  }

  @Get(':id')
  async getDocument(@Param('id') id: number) {
    return this.documentsService.getDocumentById(id);
  }

 @Post('download')
  @HttpCode(200)
  async download(@Body('path') relativePath: string, @Res() res: ExpressResponse) {
    // await the service call so Nest can surface exceptions (404/400) properly
    await this.documentsService.downloadFile(res, relativePath);
    // do NOT call res.send() afterwards; res.download ends/streams the response
  }
}

