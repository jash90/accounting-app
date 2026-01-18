export interface StorageProvider {
  upload(file: Express.Multer.File, path: string): Promise<StorageResult>;
  delete(path: string): Promise<boolean>;
  download(path: string): Promise<Buffer>;
  getUrl(path: string): Promise<string>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
  exists(path: string): Promise<boolean>;
}

export interface StorageResult {
  path: string;
  url: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface StorageConfig {
  type: 'local' | 's3';
  local: {
    path: string;
    urlPrefix: string;
  };
  s3: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
