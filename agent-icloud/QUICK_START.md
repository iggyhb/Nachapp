# Quick Start Guide

## 1. Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env
```

Required environment variables:
```
ICLOUD_WATCH_PATH=/path/to/icloud/drive
BACKEND_URL=https://your-api.com
AGENT_TOKEN=your_secret_token
```

## 2. Build

```bash
npm run build
```

## 3. Run

```bash
npm start
```

You should see:
```
╔════════════════════════════════════╗
║   iCloud Agent v0.1.0             ║
║   Watching: /path/to/folder       ║
║   Backend: https://your-app.com   ║
║   Files tracked: 0                ║
╚════════════════════════════════════╝

[2024-04-07T10:30:00.000Z] [INFO] Backend health check passed
[2024-04-07T10:30:01.000Z] [INFO] Agent started successfully
```

## 4. Add Files

Copy EPUB/PDF files to the watched folder. The agent will:
1. Detect new files
2. Calculate SHA-256 hash
3. Check for duplicates
4. Upload if new
5. Mark as processed in state

## 5. Monitor

Watch the logs for upload progress:
```
[2024-04-07T10:30:02.000Z] [INFO] File uploaded successfully: book.epub (ID: book_123)
```

## Common Tasks

### Enable Debug Logging
```bash
LOG_LEVEL=debug npm start
```

### Check Processed Files
```bash
cat agent-state.json | jq .processedFiles
```

### Check Failed Files
```bash
cat agent-state.json | jq .failedFiles
```

### Reset State (caution!)
```bash
rm agent-state.json
```

### Run in Dev Mode
```bash
npm run dev
```

### Watch TypeScript Changes
```bash
npm run watch
```

## Configuration Examples

### Larger Files
```
MAX_FILE_SIZE_MB=500
```

### Faster Processing
```
MIN_FILE_AGE_SECONDS=2
QUEUE_CONCURRENCY=4
```

### More Retries
```
MAX_RETRIES=5
RETRY_DELAY_MS=500
```

### Debug Mode
```
LOG_LEVEL=debug
```

## Troubleshooting

### Files not uploading
1. Check LOG_LEVEL=debug for errors
2. Verify ICLOUD_WATCH_PATH exists
3. Ensure files are .epub or .pdf
4. Check file size < 100MB
5. Wait 5+ seconds (file age check)

### Backend connection fails
1. Check BACKEND_URL is correct
2. Verify AGENT_TOKEN is valid
3. Ensure backend is running
4. Check network connectivity

### State file grows large
- Older processed files accumulate in state
- Safe to delete if you don't need history
- Agent will reprocess deleted entries

## API Integration

Files are uploaded via:
```
POST /api/ebooks/upload
Authorization: Bearer <AGENT_TOKEN>
Content-Type: multipart/form-data

file: <binary>
sourceType: agent
```

Backend should return:
- 201: Success with {id, title}
- 409: Duplicate hash
- 401: Invalid token
- 5xx: Temporary error (will retry)

## Advanced

### Custom Log Levels
```typescript
// In index.ts, adjust:
const logger = new Logger(config.logLevel);
```

### Modify Queue Concurrency
```
QUEUE_CONCURRENCY=1  // Serial uploads
QUEUE_CONCURRENCY=5  // Parallel uploads
```

### Change File Extensions
```
ALLOWED_EXTENSIONS=.epub,.pdf,.mobi
```

### Increase Timeout
```
MIN_FILE_AGE_SECONDS=10  // Wait 10 seconds before processing
```
