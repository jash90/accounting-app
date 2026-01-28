import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
  required?: boolean;
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly maxSize: number;
  private readonly allowedMimeTypes: string[];
  private readonly required: boolean;

  constructor(options: FileValidationOptions = {}) {
    this.maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB default
    this.allowedMimeTypes = options.allowedMimeTypes || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    this.required = options.required ?? true;
  }

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      if (this.required) {
        throw new BadRequestException('Plik jest wymagany');
      }
      return file;
    }

    if (file.size > this.maxSize) {
      const maxSizeMB = (this.maxSize / (1024 * 1024)).toFixed(1);
      throw new BadRequestException(`Plik jest za duży. Maksymalny rozmiar: ${maxSizeMB}MB`);
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Nieprawidłowy typ pliku. Dozwolone typy: ${this.allowedMimeTypes.join(', ')}`
      );
    }

    return file;
  }
}

// Predefined validators
export const ImageFileValidator = new FileValidationPipe({
  maxSize: 2 * 1024 * 1024, // 2MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
});

export const IconFileValidator = new FileValidationPipe({
  maxSize: 512 * 1024, // 512KB
  allowedMimeTypes: ['image/png', 'image/svg+xml', 'image/jpeg'],
});

export const DocumentFileValidator = new FileValidationPipe({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
});
