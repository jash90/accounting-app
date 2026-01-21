import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { StorageProvider, StorageResult } from '../interfaces/storage-provider.interface';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET', 'accounting-uploads');
    this.region = this.configService.get<string>('S3_REGION', 'us-east-1');

    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY', '');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_KEY', '');

    // Validate credentials to prevent invalid S3 client initialization
    if (!accessKeyId || !accessKeyId.trim()) {
      throw new Error(
        'S3 storage provider requires S3_ACCESS_KEY environment variable. ' +
          'Please configure S3 credentials or use local storage provider instead.'
      );
    }
    if (!secretAccessKey || !secretAccessKey.trim()) {
      throw new Error(
        'S3 storage provider requires S3_SECRET_KEY environment variable. ' +
          'Please configure S3 credentials or use local storage provider instead.'
      );
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      },
    });

    this.logger.log(`S3 storage provider initialized for bucket: ${this.bucket}`);
  }

  async upload(file: Express.Multer.File, subPath: string): Promise<StorageResult> {
    const ext = path.extname(file.originalname);
    const fileName = `${uuidv4()}${ext}`;
    const key = `${subPath}/${fileName}`.replace(/^\//, '');

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

      this.logger.log(`File uploaded to S3: ${key}`);

      return {
        path: key,
        url,
        fileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${file.originalname}`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      this.logger.log(`File deleted from S3: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${key}`, error);
      return false;
    }
  }

  async getUrl(key: string): Promise<string> {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for: ${key}`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      // Convert stream to buffer
      const stream = response.Body;
      if (!stream) {
        throw new Error(`No content returned for key: ${key}`);
      }

      // Handle different response body types
      if (stream instanceof Uint8Array) {
        return Buffer.from(stream);
      }

      // For Node.js Readable streams
      const chunks: Buffer[] = [];
      for await (const chunk of stream as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }

      this.logger.log(`File downloaded from S3: ${key}`);
      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`Failed to download file from S3: ${key}`, error);
      throw error;
    }
  }
}
