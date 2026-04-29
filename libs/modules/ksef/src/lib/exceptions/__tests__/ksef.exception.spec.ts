import { HttpStatus } from '@nestjs/common';

import {
  KsefApiException,
  KsefAuthenticationException,
  KsefConfigurationNotFoundException,
  KsefEncryptionException,
  KsefInvoiceNotDraftException,
  KsefInvoiceNotFoundException,
  KsefRateLimitException,
  KsefSessionExpiredException,
  KsefSessionNotFoundException,
  KsefXmlGenerationException,
} from '../ksef.exception';

describe('KSeF Exceptions', () => {
  describe('KsefConfigurationNotFoundException', () => {
    it('should have 404 status code and correct message', () => {
      const exception = new KsefConfigurationNotFoundException('company-123');
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      const response = exception.getResponse() as { message: string };
      expect(response.message).toContain('konfiguracji');
      expect(response.message).toContain('company-123');
    });
  });

  describe('KsefSessionNotFoundException', () => {
    it('should have 404 status code', () => {
      const exception = new KsefSessionNotFoundException('session-123');
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      const response = exception.getResponse() as { message: string };
      expect(response.message).toContain('sesja');
    });

    it('should include companyId when provided', () => {
      const exception = new KsefSessionNotFoundException('session-123', 'company-456');
      const response = exception.getResponse() as { message: string };
      expect(response.message).toContain('company-456');
    });
  });

  describe('KsefInvoiceNotFoundException', () => {
    it('should have 404 status code', () => {
      const exception = new KsefInvoiceNotFoundException('invoice-123');
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      const response = exception.getResponse() as { message: string };
      expect(response.message).toContain('faktura');
    });
  });

  describe('KsefAuthenticationException', () => {
    it('should have 401 status code', () => {
      const exception = new KsefAuthenticationException();
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should include detail when provided', () => {
      const exception = new KsefAuthenticationException('Invalid token');
      const response = exception.getResponse() as { message: string };
      expect(response.message).toContain('Invalid token');
    });
  });

  describe('KsefSessionExpiredException', () => {
    it('should have 400 status code', () => {
      const exception = new KsefSessionExpiredException('session-123');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      const response = exception.getResponse() as { message: string };
      expect(response.message).toContain('wygas');
    });
  });

  describe('KsefInvoiceNotDraftException', () => {
    it('should have 400 status code', () => {
      const exception = new KsefInvoiceNotDraftException('invoice-123');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      const response = exception.getResponse() as { message: string };
      expect(response.message).toContain('szkicu');
    });
  });

  describe('KsefRateLimitException', () => {
    it('should have 429 status code', () => {
      const exception = new KsefRateLimitException();
      expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });
  });

  describe('KsefApiException', () => {
    it('should have 502 status code', () => {
      const exception = new KsefApiException();
      expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    });

    it('should include detail when provided', () => {
      const exception = new KsefApiException('Connection timeout');
      const response = exception.getResponse() as { message: string };
      expect(response.message).toContain('Connection timeout');
    });
  });

  describe('KsefEncryptionException', () => {
    it('should have 500 status code', () => {
      const exception = new KsefEncryptionException();
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('KsefXmlGenerationException', () => {
    it('should have 500 status code', () => {
      const exception = new KsefXmlGenerationException();
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
