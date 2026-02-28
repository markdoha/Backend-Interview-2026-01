import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';
import { BulkUploadController } from './bulk-upload.controller';
import { BulkUploadService } from './bulk-upload.service';
import { DatabaseService } from '../database/database.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        storage: memoryStorage(),
        limits: {
          fileSize: configService.get<number>('MAX_FILE_SIZE_BYTES', 10485760),
          files: configService.get<number>('MAX_FILES_PER_REQUEST', 1),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [BulkUploadController],
  providers: [BulkUploadService, DatabaseService],
  exports: [BulkUploadService],
})
export class BulkUploadModule {}
