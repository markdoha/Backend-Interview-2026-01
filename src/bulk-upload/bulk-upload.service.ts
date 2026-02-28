import {
  Injectable,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as csvParse from 'csv-parse';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { BulkUploadRecord } from '../models/bulk-upload-record.model';
import { BulkUploadResultDto } from './dto/bulk-upload-result.dto';

@Injectable()
export class BulkUploadService {
  private readonly maxFileSize: number;
  private readonly maxRecords: number;
  private readonly allowedMimeTypes: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE_BYTES', 52428800); // 50MB
    this.maxRecords = this.configService.get<number>('MAX_RECORDS_PER_UPLOAD', 100000);
    
    const mimeTypesStr = this.configService.get<string>(
      'ALLOWED_MIME_TYPES',
      'text/csv,application/vnd.ms-excel,text/plain',
    );
    this.allowedMimeTypes = mimeTypesStr.split(',').map(t => t.trim());
  }

  async processCsvFile(
    file: Express.Multer.File,
    batchSize: number,
  ): Promise<BulkUploadResultDto> {
    this.validateFile(file);

    const records: BulkUploadRecord[] = [];
    const errors: Array<{ row: number; error: string }> = [];
    let rowCount = 0;
    let recordsProcessed = 0;

    const parser = csvParse.parse(file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    for await (const record of parser) {
      rowCount++;

      if (rowCount > this.maxRecords) {
        throw new PayloadTooLargeException(
          `Maximum records exceeded. Limit: ${this.maxRecords}`,
        );
      }

      try {
        const processedRecord = this.processRecord(record, rowCount);
        records.push(processedRecord);

        // Flash batch into database when size is met
        if (records.length >= batchSize) {
          const inserted = await this.databaseService.insertRecords(records);
          recordsProcessed += inserted.length;
          records.length = 0; // Clear memory array
        }
      } catch (error) {
        errors.push({
          row: rowCount,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Insert remaining records if any
    if (records.length > 0) {
      const inserted = await this.databaseService.insertRecords(records);
      recordsProcessed += inserted.length;
      records.length = 0;
    }

    if (recordsProcessed === 0 && errors.length === 0) {
      throw new BadRequestException('No valid records found in CSV file');
    }

    return {
      success: true,
      totalRows: rowCount,
      recordsProcessed,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully processed ${recordsProcessed} records`,
    };
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new PayloadTooLargeException(
        `File size exceeds limit. Maximum: ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    const isCsvExtension = file.originalname.toLowerCase().endsWith('.csv');

    if (!this.allowedMimeTypes.includes(file.mimetype) && !isCsvExtension) {
      throw new BadRequestException(
        `Invalid file type. Only CSV files are allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  private processRecord(
    rawRecord: Record<string, string>,
    rowIndex: number,
  ): BulkUploadRecord {
    const processedData: Record<string, string | number | boolean | null> = {};

    for (const [key, value] of Object.entries(rawRecord)) {
      if (!key || key.trim() === '') continue;

      const trimmedKey = key.trim();
      processedData[trimmedKey] = this.parseValue(value);
    }

    return {
      id: uuidv4(),
      data: processedData,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  private parseValue(value: string): string | number | boolean | null {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const trimmed = value.trim();

    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;

    const num = Number(trimmed);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }

    return trimmed;
  }



  async getStats() {
    return this.databaseService.getStats();
  }

  async getAllRecords(limit: number, offset: number) {
    const allRecords = await this.databaseService.getAllRecords();
    return {
      total: allRecords.length,
      records: allRecords.slice(offset, offset + limit),
    };
  }

  async getRecordById(id: string) {
    return this.databaseService.getRecordById(id);
  }

  async clearAllRecords() {
    await this.databaseService.clearRecords();
    return { success: true, message: 'All records cleared' };
  }
}
