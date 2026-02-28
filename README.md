# CSV Bulk Upload Service

A secure NestJS service for bulk uploading CSV data to a JSON-based database with authentication and rate limiting.

## Features

- **CSV Parsing**: Streaming CSV parser with automatic type detection
- **API Key Authentication**: Simple header-based authentication
- **Rate Limiting**: IP-based rate limiting to prevent DoS attacks
- **Batch Processing**: Configurable batch insertion for performance
- **Input Validation**: File type, size, and content validation

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and set your secure API key
# API_KEY=your-secure-api-key-here

# Run in development mode
npm run start:dev

# Run in production mode
npm run build
npm run start:prod
```



## Security Features

### 1. API Key Authentication

- Requests must include a valid `x-api-key` header
- Invalid or missing keys return 401 Unauthorized
- Configure your key in `.env`:

```env
API_KEY=your-secure-api-key-here
API_KEY_HEADER=x-api-key
```

### 2. Rate Limiting

- IP-based request limiting
- Default: 10 requests per minute per IP
- Returns 429 Too Many Requests when exceeded
- Includes rate limit headers:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1705312800000
Retry-After: 30
```

Configure in `.env`:
```env
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=60000
```

### 3. File Upload Limits

- Maximum file size: 10MB (configurable)
- Maximum records per upload: 10,000 (configurable)
- Only CSV files accepted

Configure in `.env`:
```env
MAX_FILE_SIZE_BYTES=10485760
MAX_RECORDS_PER_UPLOAD=10000
MAX_FILES_PER_REQUEST=1
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment (development/production) |
| `API_KEY` | - | Authentication key (required) |
| `API_KEY_HEADER` | x-api-key | Header name for API key |
| `RATE_LIMIT_MAX` | 10 | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Rate limit window in milliseconds |
| `MAX_FILE_SIZE_BYTES` | 10485760 | Max upload file size (10MB) |
| `MAX_RECORDS_PER_UPLOAD` | 10000 | Max records per CSV file |
| `MAX_FILES_PER_REQUEST` | 1 | Max files per upload request |
| `DEFAULT_BATCH_SIZE` | 100 | Default batch size for processing |
| `DEFAULT_RECORDS_LIMIT` | 100 | Default limit for records query |
| `DEFAULT_RECORDS_OFFSET` | 0 | Default offset for records query |
| `ALLOWED_MIME_TYPES` | text/csv,... | Allowed MIME types (comma separated) |

## Running Tests

```bash
# Unit tests
npm run test

# Coverage
npm run test:cov
```

## Testing the Service

### Web Interface

1. Start the server:
   ```bash
   npm run build
   node dist/main.js
   ```

2. Open `public/index.html` in your browser

3. Use the interface to:
   - View database statistics
   - Upload CSV files
   - Browse records
   - Clear the database


