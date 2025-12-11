import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIContext, User } from '@accounting/common';
import { OpenAIProviderService } from './openai-provider.service';
import { SystemCompanyService } from './system-company.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);

  constructor(
    @InjectRepository(AIContext)
    private contextRepository: Repository<AIContext>,
    private openaiProvider: OpenAIProviderService,
    private systemCompanyService: SystemCompanyService,
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
    embeddingModel?: string,
  ): Promise<AIContext> {
    // Extract text
    const extractedText = await this.extractText(filePath, mimeType);

    // Generate embedding using configured model
    const embeddingResponse = await this.openaiProvider.generateEmbedding(
      extractedText,
      apiKey,
      embeddingModel,
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
   * Check if there are any active documents for RAG.
   * Includes both company-specific documents and admin's global knowledge base.
   * Returns false gracefully if system company is not found.
   */
  async hasActiveDocuments(companyId: string | null): Promise<boolean> {
    let systemCompanyId: string | null = null;

    try {
      systemCompanyId = await this.systemCompanyService.getSystemCompanyId();
    } catch (error) {
      this.logger.warn(
        'Could not get system company for RAG check:',
        error instanceof Error ? error.message : error,
      );
      // Continue with just the user's company
    }

    // If user's company is the system company (or both are null), just check that one
    if (companyId === systemCompanyId) {
      if (!companyId) {
        return false;
      }
      const count = await this.contextRepository.count({
        where: { companyId, isActive: true },
      });
      return count > 0;
    }

    // Build where clause based on available company IDs
    const whereConditions: { companyId: string; isActive: boolean }[] = [];
    if (companyId) {
      whereConditions.push({ companyId, isActive: true });
    }
    if (systemCompanyId) {
      whereConditions.push({ companyId: systemCompanyId, isActive: true });
    }

    if (whereConditions.length === 0) {
      return false;
    }

    // For other companies, check both company-specific and global (system company) documents
    const count = await this.contextRepository.count({
      where: whereConditions,
    });
    return count > 0;
  }

  /**
   * Common stop words to filter out from keyword extraction (EN + PL)
   */
  private readonly STOP_WORDS = new Set([
    // English stop words
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'shall',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if',
    'or', 'because', 'until', 'while', 'about', 'what', 'which',
    'who', 'this', 'that', 'these', 'those', 'am', 'it', 'its',
    'you', 'your', 'we', 'our', 'they', 'their', 'he', 'she',
    'him', 'her', 'me', 'my', 'i', 'us',
    // Polish stop words
    'i', 'w', 'z', 'na', 'do', 'nie', 'się', 'jest', 'to',
    'co', 'jak', 'za', 'po', 'ale', 'tak', 'czy', 'już',
    'tylko', 'jego', 'jej', 'ich', 'my', 'wy', 'oni', 'one',
    'ten', 'ta', 'te', 'być', 'o', 'od', 'przez', 'dla',
    'że', 'go', 'jaki', 'jakie', 'który', 'która', 'które',
    'tym', 'tej', 'tego', 'także', 'oraz', 'lub', 'ani',
    'więc', 'jednak', 'kiedy', 'gdzie', 'dlaczego', 'czemu',
  ]);

  /**
   * Extract meaningful keywords from query for text search
   */
  private extractKeywords(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\sąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, ' ') // Keep Polish characters
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.STOP_WORDS.has(word))
      .slice(0, 5); // Max 5 keywords for performance
  }

  /**
   * Find relevant context documents using keyword-based text search.
   * Searches both company-specific documents and admin's global knowledge base.
   * Note: pgvector not available on Railway - using text search as alternative
   * Returns empty array gracefully if system company is not found.
   */
  async findSimilarContext(
    query: string,
    companyId: string | null,
    apiKey: string,
    limit = 3,
    embeddingModel?: string,
  ): Promise<AIContext[]> {
    let systemCompanyId: string | null = null;

    try {
      systemCompanyId = await this.systemCompanyService.getSystemCompanyId();
    } catch (error) {
      this.logger.warn(
        'Could not get system company for RAG search:',
        error instanceof Error ? error.message : error,
      );
      // Continue with just the user's company
    }

    // Determine which company IDs to search
    const companyIdsToSearch: string[] = [];
    if (companyId) {
      companyIdsToSearch.push(companyId);
    }
    // Add system company for global knowledge base (if not already included)
    if (systemCompanyId && systemCompanyId !== companyId) {
      companyIdsToSearch.push(systemCompanyId);
    }

    // If no companies to search, return empty
    if (companyIdsToSearch.length === 0) {
      this.logger.debug('RAG search: no companies to search, returning empty');
      return [];
    }

    this.logger.debug(
      `RAG search: query="${query.substring(0, 50)}...", companies=[${companyIdsToSearch.join(', ')}]`,
    );

    // Extract keywords from user query
    const keywords = this.extractKeywords(query);

    // If no meaningful keywords, fall back to most recent documents
    if (keywords.length === 0) {
      return this.contextRepository.find({
        where: companyIdsToSearch.map((cid) => ({ companyId: cid, isActive: true })),
        order: { createdAt: 'DESC' },
        take: limit,
      });
    }

    // Build query with keyword matching in extractedText
    const queryBuilder = this.contextRepository
      .createQueryBuilder('context')
      .where('context.companyId IN (:...companyIds)', { companyIds: companyIdsToSearch })
      .andWhere('context.isActive = :isActive', { isActive: true });

    // Build OR conditions for each keyword (case-insensitive)
    const keywordConditions = keywords
      .map((_, i) => `LOWER(context.extractedText) LIKE :keyword${i}`)
      .join(' OR ');

    const keywordParams: Record<string, string> = {};
    keywords.forEach((kw, i) => {
      keywordParams[`keyword${i}`] = `%${kw}%`;
    });

    queryBuilder
      .andWhere(`(${keywordConditions})`, keywordParams)
      .orderBy('context.createdAt', 'DESC')
      .limit(limit);

    const results = await queryBuilder.getMany();

    // If no keyword matches found, fall back to most recent documents
    if (results.length === 0) {
      return this.contextRepository.find({
        where: companyIdsToSearch.map((cid) => ({ companyId: cid, isActive: true })),
        order: { createdAt: 'DESC' },
        take: limit,
      });
    }

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
