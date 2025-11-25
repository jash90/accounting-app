import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIContext, User } from '@accounting/common';
import { OpenAIProviderService } from './openai-provider.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class RAGService {
  constructor(
    @InjectRepository(AIContext)
    private contextRepository: Repository<AIContext>,
    private openaiProvider: OpenAIProviderService,
  ) {}

  /**
   * Extract text from uploaded file based on mime type
   */
  async extractText(
    filePath: string,
    mimeType: string,
  ): Promise<string> {
    const buffer = await fs.readFile(filePath);

    switch (mimeType) {
      case 'application/pdf':
        const pdfData = await (pdfParse as any).default(buffer);
        return pdfData.text;

      case 'text/plain':
      case 'text/markdown':
        return buffer.toString('utf-8');

      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  /**
   * Process uploaded file: extract text and generate embedding
   */
  async processFile(
    filePath: string,
    filename: string,
    mimeType: string,
    fileSize: number,
    companyId: string | null,
    user: User,
    apiKey: string,
  ): Promise<AIContext> {
    // Extract text
    const extractedText = await this.extractText(filePath, mimeType);

    // Generate embedding
    const embeddingResponse = await this.openaiProvider.generateEmbedding(
      extractedText,
      apiKey,
    );

    // Create context entity
    const context = this.contextRepository.create({
      companyId,
      filename,
      mimeType,
      filePath,
      fileSize,
      extractedText,
      embedding: embeddingResponse.embedding,
      uploadedById: user.id,
      isActive: true,
    });

    return this.contextRepository.save(context);
  }

  /**
   * Check if there are any active documents for RAG
   */
  async hasActiveDocuments(companyId: string | null): Promise<boolean> {
    const count = await this.contextRepository.count({
      where: { companyId, isActive: true },
    });
    return count > 0;
  }

  /**
   * Find similar context using vector similarity
   */
  async findSimilarContext(
    query: string,
    companyId: string | null,
    apiKey: string,
    limit = 3,
  ): Promise<AIContext[]> {
    // Generate embedding for query
    const queryEmbedding = await this.openaiProvider.generateEmbedding(
      query,
      apiKey,
    );

    // Perform vector similarity search using pgvector
    // Using cosine distance: 1 - (embedding <=> query_embedding)
    const results = await this.contextRepository
      .createQueryBuilder('context')
      .where('context.companyId = :companyId', { companyId })
      .andWhere('context.isActive = :isActive', { isActive: true })
      .orderBy('context.embedding <=> :embedding', 'ASC')
      .setParameter('embedding', JSON.stringify(queryEmbedding.embedding))
      .limit(limit)
      .getMany();

    return results;
  }

  /**
   * Build RAG context from similar documents
   */
  buildRAGContext(contexts: AIContext[]): string {
    if (contexts.length === 0) {
      return '';
    }

    const contextTexts = contexts.map((ctx, index) => {
      return `--- Context Document ${index + 1}: ${ctx.filename} ---\n${ctx.extractedText}\n`;
    });

    return `\n\nRelevant Context from Knowledge Base:\n${contextTexts.join('\n')}`;
  }
}
