// src/documents/documents.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Document } from './entity/documents.model';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Document) private documentModel: typeof Document
  ) {}

 async createDocument(title: string, file: Express.Multer.File) {
   const document = await this.documentModel.create({
    title,
    location: `/avatars/${file.filename}`, // the path you want to store
  });

  return document;
  }

  async getAllDocuments(): Promise<Document[]> {
    return this.documentModel.findAll();
  }

  async getDocumentById(id: number): Promise<Document | null> {
    return this.documentModel.findByPk(id);
  }
}
