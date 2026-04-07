# iCloud Agent v0.1.0

A file processing pipeline and API client for uploading EPUB and PDF files from iCloud Drive to your personal app backend.

## Features

- Watches an iCloud Drive folder for new EPUB/PDF files
- Automatically uploads detected files to the backend API
- Tracks processed files with SHA-256 hashing to prevent duplicates
- Handles retries with exponential backoff and jitter
- Graceful shutdown with queue draining
- Persistent state management (tracks processed files and failures)
- Queue-based processing to prevent parallel uploads of the same file
- Health checks and detailed logging

## Architecture

### Components

- **ApiClient** (`src/api-client.ts`) - HTTP client for backend communication
  - Upload files with multipart/form-data
  - Check for duplicate hashes
  - Health checks

- **FileProcessor** (`src/processor.ts`) - File processing pipeline
  - Validates file existence, size, age, and extension
  - Calculates SHA-256 hash
  - Checks for duplicates locally and on backend
  - Handles retries with exponential backoff
  - Uploads files and marks as processed

- **ProcessingQueue** (`src/queue.ts`) - In-memory upload queue
  - Manages concurrent uploads
  - Prevents duplicate queuing
  - Tracks queue statistics

- **StateManager** (`src/state-manager.ts`) - Persistent state
  - Tracks processed files with metadata
  - Tracks failed files and retry attempts
  - Saves state to JSON file

- **Logger** (`src/logger.ts`) - Structured logging
  - Configurable log levels
  - ISO timestamp prefixes
  - Log level filtering

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd agent-icloud
npm install
npm run build
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `ICLOUD_WATCH_PATH` - Path to your iCloud Drive folder
- `BACKEND_URL` - Your personal app backend URL
- `AGENT_TOKEN` - Bearer token for API authentication

Optional variables (see `.env.example` for defaults):
- `MAX_FILE_SIZE_MB` - Maximum file size (default: 100)
- `MIN_FILE_AGE_SECONDS` - Minimum age before processing (default: 5, avoids partial syncs)
- `MAX_RETRIES` - Retry attempts (default: 3)
- `QUEUE_CONCURRENCY` - Parallel uploads (default: 2)
- `LOG_LEVEL` - debug, info, warn, error (default: info)

## Usage

### Run the agent

```bash
npm start
```

The agent will:
1. Load configuration from `.env`
2. Validate backend connectivity
3. Print a startup banner
4. Begin watching the configured folder
5. Process new/changed files automatically

### Graceful shutdown

Press Ctrl+C (SIGINT) or send SIGTERM to stop the agent gracefully:
- Stops file watcher
- Waits for queue to drain
- Saves state
- Logs goodbye message

## File Processing Pipeline

When a file is detected:

1. **Validate** - Check file exists, is readable
2. **Filter** - Check extension (.epub, .pdf), skip .icloud placeholders and temp files
3. **Size check** - Reject files > 100MB (configurable)
4. **Age check** - Skip files younger than 5 seconds (still syncing)
5. **Hash** - Calculate SHA-256
6. **Duplicate check (local)** - Check against processed files
7. **Duplicate check (backend)** - Check against backend hash index
8. **Upload** - POST to backend with Bearer token
9. **Mark** - Save to state if successful
10. **Retry** - On error, exponential backoff up to max retries

## Duplicate Detection

Files are deduplicated using SHA-256 hashing:
- Local state tracks all processed files and their hashes
- Backend API provides a hash lookup endpoint
- If duplicate detected, file is marked as processed without uploading

## Retry Logic

Failed uploads use exponential backoff with jitter:
- Base delay: 1000ms (configurable)
- Exponential: `baseDelay * 2^(retries-1)`
- Jitter: ±10% of delay
- Maximum retries: 3 (configurable)

Example timing for 3 retries:
- Attempt 1: Initial upload
- Attempt 2: ~1s delay
- Attempt 3: ~2s delay
- Attempt 4: ~4s delay
- Then fail

## State File

The agent saves state to `agent-state.json`:

```json
{
  "version": 1,
  "lastSync": "2024-04-07T10:30:00.000Z",
  "processedFiles": {
    "/path/to/file.epub": {
      "filePath": "/path/to/file.epub",
      "hash": "abc123...",
      "bookId": "book_123",
      "processedAt": "2024-04-07T10:30:00.000Z",
      "sourceType": "agent"
    }
  },
  "failedFiles": {
    "/path/to/failed.pdf": {
      "error": "Network timeout",
      "attempts": 3,
      "lastAttempt": "2024-04-07T10:35:00.000Z"
    }
  }
}
```

## API Integration

The agent communicates with the backend via:

```
POST /api/ebooks/upload
Content-Type: multipart/form-data
Authorization: Bearer <agentToken>

file: <binary>
sourceType: agent
```

Expected responses:
- `201 Created` - Success, returns book data with `id` and `title`
- `409 Conflict` - Duplicate hash already exists
- `401 Unauthorized` - Invalid or expired token
- Other status - Error, logged and retried

## Logging

The agent logs at the configured level:

```
[2024-04-07T10:30:00.000Z] [INFO] Backend health check passed
[2024-04-07T10:30:01.000Z] [DEBUG] File added: /path/to/file.epub
[2024-04-07T10:30:02.000Z] [INFO] File uploaded successfully: /path/to/file.epub (ID: book_123)
```

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

## Troubleshooting

### Agent won't start
- Check `.env` file exists and has required variables
- Verify `ICLOUD_WATCH_PATH` exists and is readable
- Check `BACKEND_URL` is correct and accessible

### Files not uploading
- Check `LOG_LEVEL=debug` for detailed error messages
- Verify files are older than `MIN_FILE_AGE_SECONDS` (iCloud sync)
- Check file extension is in `ALLOWED_EXTENSIONS`
- Check file size is under `MAX_FILE_SIZE_MB`
- Verify agent token has backend access

### Backend health check fails
- Check `BACKEND_URL` and `AGENT_TOKEN` are correct
- Verify backend is running and accessible
- Check network connectivity

### Duplicate files being uploaded
- State file may be corrupted, delete `agent-state.json` to reset
- Backend may not have updated its hash index

## Performance

Queue statistics are available via `ProcessingQueue.getStats()`:

```typescript
{
  queued: 0,      // Files waiting to upload
  processing: 1,  // Currently uploading
  completed: 42,  // Successfully uploaded or duplicated
  failed: 2       // Failed after max retries
}
```

Adjust `QUEUE_CONCURRENCY` based on:
- Network bandwidth
- Backend load capacity
- Local disk I/O

## Development

Build and watch:

```bash
npm run watch
```

Run in dev mode (rebuild + start):

```bash
npm run dev
```

## License

Proprietary - Personal App Agent
