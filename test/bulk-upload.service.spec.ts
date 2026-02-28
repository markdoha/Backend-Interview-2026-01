import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BulkUploadService } from '../src/bulk-upload/bulk-upload.service';
import { DatabaseService } from '../src/database/database.service';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

describe('BulkUploadService', () => {
  let service: BulkUploadService;
  let databaseService: DatabaseService;

  const mockDatabaseService = {
    insertRecords: jest.fn(),
    getAllRecords: jest.fn(),
    getRecordById: jest.fn(),
    clearRecords: jest.fn(),
    getStats: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: any) => {
      const config: Record<string, any> = {
        MAX_FILE_SIZE_BYTES: 10485760,
        MAX_RECORDS_PER_UPLOAD: 10000,
        ALLOWED_MIME_TYPES: 'text/csv,application/vnd.ms-excel,text/plain',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkUploadService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BulkUploadService>(BulkUploadService);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processCsvFile', () => {
    it('should throw error when no file is provided', async () => {
      await expect(service.processCsvFile(null as any, 100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for files exceeding size limit', async () => {
      const largeFile = {
        buffer: Buffer.from('test'),
        size: 20 * 1024 * 1024,
        originalname: 'test.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      await expect(service.processCsvFile(largeFile, 100)).rejects.toThrow(
        PayloadTooLargeException,
      );
    });

    it('should throw error for non-CSV files', async () => {
      const invalidFile = {
        buffer: Buffer.from('test'),
        size: 100,
        originalname: 'test.txt',
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      await expect(service.processCsvFile(invalidFile, 100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully process a valid CSV file', async () => {
      const csvContent = 'name,age,active\nJohn,30,true\nJane,25,false';
      const validFile = {
        buffer: Buffer.from(csvContent),
        size: csvContent.length,
        originalname: 'test.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      mockDatabaseService.insertRecords.mockResolvedValue([
        { id: '1', data: { name: 'John', age: 30, active: true } },
        { id: '2', data: { name: 'Jane', age: 25, active: false } },
      ]);

      const result = await service.processCsvFile(validFile, 100);

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(2);
      expect(result.recordsProcessed).toBe(2);
    });

    it('should throw error for empty CSV file', async () => {
      const emptyFile = {
        buffer: Buffer.from('name,age\n'),
        size: 10,
        originalname: 'empty.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      await expect(service.processCsvFile(emptyFile, 100)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

});
