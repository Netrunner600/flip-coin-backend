// src/documents/documents.controller.ts
import { Controller, Post, Get, Param, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { multerConfig } from '../config/multer.config';
import { CreateDocumentDto } from './create-document.dto';

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
}
