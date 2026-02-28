/**
 * BULK UPLOAD FEATURE — IMPLEMENTED
 *
 * Implementation complete. See:
 * 
 * - Bulk upload service: src/bulk-upload/bulk-upload.service.ts
 * - Controller endpoints: src/bulk-upload/bulk-upload.controller.ts
 * - Record model: src/models/bulk-upload-record.model.ts
 * - Temp DB: data/bulk-upload-temp.json
 * 
 * Authentication: API Key via x-api-key header (src/common/guards/api-key.guard.ts)
 * Rate Limiting: IP-based rate limiting (src/common/middleware/rate-limiter.middleware.ts)
 * 
 * Endpoints:
 * - POST /bulk-upload/upload - Upload CSV file
 * - GET /bulk-upload/stats - Get database stats (public)
 * - GET /bulk-upload/records - List all records
 * - GET /bulk-upload/records/:id - Get specific record
 * - DELETE /bulk-upload/records - Clear all records
 */
