import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { Company, User, UserRole } from '@accounting/common';
import { EmailConfigurationService, EmailSenderService } from '@accounting/email';
import { EmailService } from '@accounting/infrastructure/email';

import { CompanyService } from './company.service';

describe('CompanyService', () => {
  let service: CompanyService;
  let userRepository: jest.Mocked<Repository<User>>;
  let companyRepository: jest.Mocked<Repository<Company>>;
  let emailService: jest.Mocked<Pick<EmailService, never>>;
  let emailSenderService: jest.Mocked<Pick<EmailSenderService, 'sendEmailAndSave'>>;
  let emailConfigService: jest.Mocked<
    Pick<EmailConfigurationService, 'getDecryptedEmailConfigByCompanyId'>
  >;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  const companyId = 'company-1';
  const employeeId = 'employee-1';

  const mockEmployee: User = {
    id: employeeId,
    email: 'employee@test.com',
    firstName: 'Jan',
    lastName: 'Kowalski',
    role: UserRole.EMPLOYEE,
    companyId,
    isActive: true,
    password: 'hashed',
  } as User;

  const mockCompany: Company = {
    id: companyId,
    name: 'Test Company',
    ownerId: 'owner-1',
    isActive: true,
    nip: '1234567890',
  } as Company;

  const ownerUser: User = {
    id: 'owner-1',
    role: UserRole.COMPANY_OWNER,
    companyId,
  } as User;

  beforeEach(async () => {
    jest.clearAllMocks();

    userRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    companyRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<Company>>;

    emailService = {};

    emailSenderService = {
      sendEmailAndSave: jest.fn().mockResolvedValue(undefined),
    };

    emailConfigService = {
      getDecryptedEmailConfigByCompanyId: jest.fn().mockResolvedValue(null),
    };

    configService = {
      get: jest.fn().mockReturnValue('http://localhost:4200'),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: CompanyService,
          useFactory: () =>
            new CompanyService(
              userRepository as any,
              companyRepository as any,
              emailService as any,
              emailSenderService as any,
              emailConfigService as any,
              configService as any
            ),
        },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Company), useValue: companyRepository },
        { provide: EmailService, useValue: emailService },
        { provide: EmailSenderService, useValue: emailSenderService },
        { provide: EmailConfigurationService, useValue: emailConfigService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(CompanyService);
  });

  describe('getEmployees', () => {
    it('should return employees for a company', async () => {
      userRepository.find.mockResolvedValue([mockEmployee]);

      const result = await service.getEmployees(companyId);

      expect(result).toEqual([mockEmployee]);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { companyId, role: UserRole.EMPLOYEE },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getEmployeeById', () => {
    it('should return employee by ID with tenant isolation', async () => {
      userRepository.findOne.mockResolvedValue(mockEmployee);

      const result = await service.getEmployeeById(companyId, employeeId);

      expect(result).toEqual(mockEmployee);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: employeeId, companyId, role: UserRole.EMPLOYEE },
      });
    });

    it('should throw NotFoundException when employee not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getEmployeeById(companyId, 'nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('createEmployee', () => {
    it('should create employee with hashed password', async () => {
      const dto = {
        email: 'new@test.com',
        password: 'Password123',
        firstName: 'Anna',
        lastName: 'Nowak',
      };
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockEmployee);
      userRepository.save.mockResolvedValue(mockEmployee);

      const result = await service.createEmployee(companyId, dto as any);

      expect(result).toEqual(mockEmployee);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.EMPLOYEE,
          companyId,
          isActive: true,
        })
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      const dto = { email: 'employee@test.com', password: 'Password123' };
      userRepository.findOne.mockResolvedValue(mockEmployee);

      await expect(service.createEmployee(companyId, dto as any)).rejects.toThrow(
        ConflictException
      );
    });

    it('should not throw when email notification fails', async () => {
      const dto = {
        email: 'new@test.com',
        password: 'Password123',
        firstName: 'Anna',
        lastName: 'Nowak',
      };
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockEmployee);
      userRepository.save.mockResolvedValue(mockEmployee);
      // Email config available but send fails
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue({
        smtp: {},
        imap: {},
      } as any);
      emailSenderService.sendEmailAndSave.mockRejectedValue(new Error('SMTP error'));
      companyRepository.findOne.mockResolvedValue(mockCompany);

      // Should not throw despite email failure
      const result = await service.createEmployee(companyId, dto as any);
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('updateEmployee', () => {
    it('should update employee fields', async () => {
      const dto = { firstName: 'Updated' };
      const updated = { ...mockEmployee, firstName: 'Updated' } as User;
      userRepository.findOne.mockResolvedValue(mockEmployee);
      userRepository.save.mockResolvedValue(updated);

      const result = await service.updateEmployee(companyId, employeeId, dto as any);

      expect(result).toEqual(updated);
    });

    it('should throw ConflictException when updating to existing email', async () => {
      const dto = { email: 'existing@test.com' };
      userRepository.findOne.mockResolvedValueOnce(mockEmployee); // getEmployeeById
      userRepository.findOne.mockResolvedValueOnce({ id: 'other' } as User); // email check

      await expect(service.updateEmployee(companyId, employeeId, dto as any)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('softDeleteEmployee', () => {
    it('should set isActive to false', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockEmployee });
      userRepository.save.mockResolvedValue({ ...mockEmployee, isActive: false } as User);

      const result = await service.softDeleteEmployee(companyId, employeeId);

      expect(result.isActive).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('should return company profile for user', async () => {
      companyRepository.findOne.mockResolvedValue(mockCompany);

      const result = await service.getProfile(ownerUser);

      expect(result).toEqual(mockCompany);
    });

    it('should throw NotFoundException when user has no companyId', async () => {
      const userNoCompany = { ...ownerUser, companyId: undefined } as unknown as User;

      await expect(service.getProfile(userNoCompany)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when company not found', async () => {
      companyRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfile(ownerUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update company profile', async () => {
      const dto = { name: 'Updated Company', nip: '9876543210' };
      const updated = { ...mockCompany, ...dto } as Company;
      companyRepository.findOne.mockResolvedValue({ ...mockCompany });
      companyRepository.save.mockResolvedValue(updated);

      const result = await service.updateProfile(ownerUser, dto as any);

      expect(result).toEqual(updated);
    });
  });
});
