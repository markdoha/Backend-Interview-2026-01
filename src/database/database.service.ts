import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { BulkUploadRecord } from '../models/bulk-upload-record.model';

interface DatabaseStructure {
  records: BulkUploadRecord[];
  metadata: {
    createdAt: string | null;
    updatedAt: string | null;
    description: string;
  };
}

@Injectable()
export class DatabaseService {
  private readonly dbPath: string;

  constructor() {
    this.dbPath = path.resolve(process.cwd(), 'data/bulk-upload-temp.json');
  }

  private async readDatabase(): Promise<DatabaseStructure> {
    try {
      const data = await fs.promises.readFile(this.dbPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      throw new InternalServerErrorException('Failed to read database');
    }
  }

  private async writeDatabase(data: DatabaseStructure): Promise<void> {
    try {
      data.metadata.updatedAt = new Date().toISOString();
      if (!data.metadata.createdAt) {
        data.metadata.createdAt = data.metadata.updatedAt;
      }
      await fs.promises.writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      throw new InternalServerErrorException('Failed to write to database');
    }
  }

  async getAllRecords(): Promise<BulkUploadRecord[]> {
    const db = await this.readDatabase();
    return db.records;
  }

  async getRecordById(id: string): Promise<BulkUploadRecord | undefined> {
    const db = await this.readDatabase();
    return db.records.find((r) => r.id === id);
  }

  async insertRecords(records: BulkUploadRecord[]): Promise<BulkUploadRecord[]> {
    const db = await this.readDatabase();
    db.records.push(...records);
    await this.writeDatabase(db);
    return records;
  }

  async clearRecords(): Promise<void> {
    const db = await this.readDatabase();
    db.records = [];
    await this.writeDatabase(db);
  }

  async getStats(): Promise<{ totalRecords: number; lastUpdated: string | null }> {
    const db = await this.readDatabase();
    return {
      totalRecords: db.records.length,
      lastUpdated: db.metadata.updatedAt,
    };
  }
}
