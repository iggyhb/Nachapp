# iCloud Agent - File Structure

## Project Layout

```
agent-icloud/
├── src/                          # TypeScript source code
│   ├── api-client.ts            # Backend HTTP client (fetch, FormData)
│   ├── config.ts                # Configuration from environment
│   ├── index.ts                 # Main entry point (startup, shutdown)
│   ├── logger.ts                # Structured logging utility
│   ├── processor.ts             # File processing pipeline
│   ├── queue.ts                 # Concurrent upload queue
│   └── state-manager.ts         # Persistent state (JSON)
├── dist/                         # Compiled JavaScript (generated)
│   ├── *.js                     # Compiled source
│   ├── *.d.ts                   # TypeScript declarations
│   └── *.js.map                 # Source maps
├── .env.example                  # Environment variable template
├── .gitignore                    # Git ignore rules
├── README.md                     # Full documentation
├── QUICK_START.md               # Quick reference
├── FILE_STRUCTURE.md            # This file
├── package.json                 # NPM dependencies and scripts
├── package-lock.json            # Dependency lock file
├── tsconfig.json                # TypeScript compiler config
└── agent-state.json             # Persistent state (generated at runtime)
```

## Source Files

### api-client.ts (215 lines)
**HTTP Client for Backend API**

Classes:
- `ApiClient` - Main API client class

Interfaces:
- `UploadResult` - Response from file upload
- `HealthCheckResult` - Response from health check

Methods:
- `uploadFile(filePath, buffer, mimeType)` - Upload file with Bearer token
- `checkDuplicate(hash)` - Check if hash exists on backend
- `healthCheck()` - Verify backend is accessible
- `static calculateHash(buffer)` - SHA-256 hash utility

Key Features:
- Native fetch() API (Node 18+)
- FormData for multipart requests
- Bearer token authentication
- Error handling for all HTTP status codes
- Duplicate detection via hash lookup
- Logging via Logger instance

### config.ts (67 lines)
**Environment Configuration**

Interfaces:
- `Config` - Full configuration object

Functions:
- `loadConfig(logger)` - Load and validate environment variables

Configuration Options:
- Required: ICLOUD_WATCH_PATH, BACKEND_URL, AGENT_TOKEN
- Optional: LOG_LEVEL, MAX_FILE_SIZE_MB, MIN_FILE_AGE_SECONDS, etc.
- All with sensible defaults

### index.ts (176 lines)
**Main Application Entry Point**

Functions:
- `main()` - Initialize and run the agent
- `printBanner(config, processedCount)` - Startup banner

Initialization Steps:
1. Load configuration
2. Create logger
3. Create state manager
4. Create API client
5. Health check backend
6. Create file processor
7. Create processing queue
8. Print startup banner
9. Start file watcher (chokidar)
10. Setup signal handlers (SIGINT/SIGTERM)

Event Handlers:
- `watcher.on('add')` - New file detected
- `watcher.on('change')` - File modified
- `watcher.on('error')` - Watcher error
- `watcher.on('ready')` - Initial scan complete
- `process.on('SIGINT/SIGTERM')` - Graceful shutdown

### logger.ts (47 lines)
**Structured Logging Utility**

Classes:
- `Logger` - Main logging class

Type Definitions:
- `LogLevel` - 'debug' | 'info' | 'warn' | 'error'

Methods:
- `debug(message)` - Debug level log
- `info(message)` - Info level log
- `warn(message)` - Warning level log
- `error(message)` - Error level log

Features:
- Configurable log level
- ISO 8601 timestamps
- Level-based filtering
- Console output (debug/info via stdout, warn/error via stderr)

### processor.ts (324 lines)
**File Processing Pipeline**

Interfaces:
- `Config` - Processing configuration
- `ProcessResult` - Result of processing a file

Classes:
- `FileProcessor` - Main processor class

Methods:
- `processFile(filePath)` - Single-pass pipeline
- `processWithRetry(filePath)` - Wrapper with retry logic
- `validateFileExists(filePath)` - Check file exists
- `validateFileSize(filePath)` - Check < 100MB
- `validateFileAge(filePath)` - Check > 5 seconds old
- `sleep(ms)` - Utility delay function

Pipeline Steps:
1. Validate file exists
2. Check file extension
3. Skip special files (.icloud, dotfiles, temps)
4. Check file size
5. Check file age
6. Read file and hash
7. Check local state
8. Check backend for duplicate
9. Upload to backend
10. Mark as processed
11. Retry on error with backoff

Configuration:
- maxRetries: 3
- retryDelayMs: 1000
- maxFileSizeBytes: 100MB
- minFileAgeSeconds: 5
- allowedExtensions: ['.epub', '.pdf']

### queue.ts (119 lines)
**Concurrent Upload Queue**

Interfaces:
- `QueuedTask` - Task in queue
- `QueueStats` - Queue statistics

Classes:
- `ProcessingQueue` - Main queue class

Methods:
- `enqueue(filePath, processor)` - Add file to queue
- `isQueued(filePath)` - Check if file is queued
- `getStats()` - Get queue statistics
- `drain()` - Wait for queue to empty
- `processQueue()` - Internal queue processor
- `processTask(task)` - Execute single task

Configuration:
- concurrency: 2 (default)
- Can be adjusted via QUEUE_CONCURRENCY env var

Statistics Tracked:
- queued: Waiting to process
- processing: Currently uploading
- completed: Successfully processed
- failed: Failed after max retries

### state-manager.ts (134 lines)
**Persistent State Management**

Interfaces:
- `ProcessedFile` - Metadata of processed file
- `AgentState` - Full state object

Classes:
- `StateManager` - Main state management class

Methods:
- `loadState()` - Load from JSON file
- `saveState()` - Persist to JSON file
- `isProcessed(filePath)` - Check if already processed
- `markProcessed(filePath, hash, bookId)` - Mark success
- `getFailedAttempts(filePath)` - Get retry count
- `markFailed(filePath, error)` - Mark failed
- `clearFailed(filePath)` - Clear failure record
- `getProcessedCount()` - Count processed files
- `getFailedCount()` - Count failed files
- `getState()` - Get full state object

State File Format:
```json
{
  "version": 1,
  "lastSync": "2024-04-07T10:30:00Z",
  "processedFiles": {
    "/path/to/file.epub": {
      "filePath": "/path/to/file.epub",
      "hash": "abc123...",
      "bookId": "book_123",
      "processedAt": "2024-04-07T10:30:00Z",
      "sourceType": "agent"
    }
  },
  "failedFiles": {
    "/path/to/failed.pdf": {
      "error": "Network error",
      "attempts": 3,
      "lastAttempt": "2024-04-07T10:35:00Z"
    }
  }
}
```

## Configuration Files

### package.json
- Node version: >= 18.0.0
- Dependencies: chokidar
- DevDependencies: @types/node, typescript
- Scripts: build, start, dev, watch

### tsconfig.json
- Target: ES2020
- Module: CommonJS
- Strict mode: true
- Declarations: generated
- Source maps: generated

### .env.example
Template with:
- All required variables
- All optional variables with defaults
- Descriptions and examples
- Comments explaining each setting

### .gitignore
Ignores:
- node_modules/
- dist/
- .env
- *.log
- agent-state.json

## Build Output

### dist/ Directory (Generated)
- *.js - Compiled JavaScript
- *.js.map - Source maps for debugging
- *.d.ts - TypeScript declarations
- *.d.ts.map - Declaration source maps

## Runtime Files

### agent-state.json (Generated)
- Created on first run
- Updated after each file processed
- Persists across restarts
- Safe to delete (will reprocess files)

## Compilation

```bash
npm run build
# Generates dist/ directory from src/
# Output can be run with: node dist/index.js
```

## Production Deployment

Key files:
- dist/ - Deploy this (compiled JavaScript)
- node_modules/ - Include (dependencies)
- .env - Configure with production values
- package.json - For npm scripts
- README.md, QUICK_START.md - Documentation

Source files (optional):
- src/ - Include for debugging
- *.map files - Include for stack traces

## Size Reference

- src/ files: ~1.1 KB total
- dist/ files: ~150 KB (compiled + maps)
- node_modules/: ~50 MB (including TypeScript)
- agent-state.json: Grows with processed files (~100 bytes per file)
