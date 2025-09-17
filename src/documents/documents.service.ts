// src/documents/documents.service.ts
import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Document } from './entity/documents.model';
import * as path from 'path';
import * as fs from 'fs';
import type { Response as ExpressResponse } from 'express';

const PUBLIC_ROOT = process.env.PUBLIC_DIR || path.join(process.cwd(), 'public');

@Injectable()
export class DocumentsService {
  constructor(@InjectModel(Document) private documentModel: typeof Document) {}

  async createDocument(title: string, file: Express.Multer.File): Promise<Document> {
    if (!file || !file.filename) {
      throw new BadRequestException('File is required');
    }

    const location = `public/avatars/${file.filename}`;
    const name = title || file.originalname || file.filename;
    const type = file.mimetype || 'application/octet-stream';

    const document = await this.documentModel.create({
      title: name,
      location,
    });

    return document;
  }

  async getAllDocuments(): Promise<Document[]> {
    return this.documentModel.findAll();
  }

  async getDocumentById(id: number): Promise<Document | null> {
    return this.documentModel.findByPk(id);
  }

  async resolveSafe(relativePath: string): Promise<string> {
    if (!relativePath || typeof relativePath !== 'string') {
      throw new BadRequestException('Missing path');
    }

    let p = path.normalize(relativePath).replace(/^[/\\]+/, '');

    if (p.startsWith('public' + path.sep)) {
      p = p.slice(('public' + path.sep).length);
    }

    const full = path.resolve(PUBLIC_ROOT, p);
    const resolvedPublic = path.resolve(PUBLIC_ROOT);
    if (!full.startsWith(resolvedPublic)) {
      throw new BadRequestException('Invalid path');
    }

    return full;
  }

  async downloadFile(res: ExpressResponse, relativePath: string): Promise<void> {
    try {
      const fullPath = await this.resolveSafe(relativePath);

      const stat = await fs.promises.stat(fullPath).catch(() => null);
      if (!stat || !stat.isFile()) {
        throw new NotFoundException('File not found');
      }

      await new Promise<void>((resolve, reject) => {
        res.download(fullPath, path.basename(fullPath), (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException(err?.message || 'Failed to download file');
    }
  }
}
