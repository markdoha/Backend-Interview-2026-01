import {
  Controller,
  Post,
  Get,
  Delete,
  UseInterceptors,
  UploadedFile,
  Query,
  Param,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { BulkUploadService } from './bulk-upload.service';
import { BulkUploadResultDto } from './dto/bulk-upload-result.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('bulk-upload')
export class BulkUploadController {
  private readonly defaultBatchSize: number;
  private readonly defaultLimit: number;
  private readonly defaultOffset: number;

  constructor(
    private readonly bulkUploadService: BulkUploadService,
    private readonly configService: ConfigService,
  ) {
    this.defaultBatchSize = this.configService.get<number>('DEFAULT_BATCH_SIZE', 100);
    this.defaultLimit = this.configService.get<number>('DEFAULT_RECORDS_LIMIT', 100);
    this.defaultOffset = this.configService.get<number>('DEFAULT_RECORDS_OFFSET', 0);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async uploadCsv(
    @UploadedFile() file: Express.Multer.File,
    @Query('batchSize') batchSize?: string,
  ): Promise<BulkUploadResultDto> {
    const size = batchSize ? parseInt(batchSize, 10) || this.defaultBatchSize : this.defaultBatchSize;
    return this.bulkUploadService.processCsvFile(file, size);
  }

  @Get('stats')
  @Public()
  async getStats() {
    return this.bulkUploadService.getStats();
  }

  @Get('records')
  @Public()
  async getRecords(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) || this.defaultLimit : this.defaultLimit;
    const offsetNum = offset ? parseInt(offset, 10) || this.defaultOffset : this.defaultOffset;
    return this.bulkUploadService.getAllRecords(limitNum, offsetNum);
  }

  @Get('records/:id')
  async getRecord(@Param('id') id: string) {
    const record = await this.bulkUploadService.getRecordById(id);
    if (!record) {
      return { success: false, message: 'Record not found' };
    }
    return { success: true, record };
  }

  @Delete('records')
  @HttpCode(HttpStatus.OK)
  async clearRecords() {
    return this.bulkUploadService.clearAllRecords();
  }
}
