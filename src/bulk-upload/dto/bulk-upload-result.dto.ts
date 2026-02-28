export class BulkUploadResultDto {
  success: boolean;
  totalRows: number;
  recordsProcessed: number;
  errors?: Array<{ row: number; error: string }>;
  message: string;
}
