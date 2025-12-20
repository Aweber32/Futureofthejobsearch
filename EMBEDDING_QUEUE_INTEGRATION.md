# Embedding Queue Integration

## Overview
This document describes the Azure Storage Queue integration implemented to automatically trigger ML embedding generation when seekers or positions are created or updated.

## Architecture

### Components Created

1. **EmbeddingQueueService** (`server/Services/EmbeddingQueueService.cs`)
   - Interface: `IEmbeddingQueueService`
   - Implementation: `EmbeddingQueueService`
   - Purpose: Send embedding generation requests to Azure Storage Queue
   - Pattern: Fire-and-forget (non-blocking)

2. **Azure Storage Queue**
   - Queue Name: `embedding-requests` (configured in appsettings.json)
   - Connection: Uses existing `BlobConnection` string from appsettings.json
   - Message Format: `{ "entityType": "Candidate"|"Position", "entityId": "123" }`

### Integration Points

#### Program.cs
- Service registered as Singleton in DI container
- Added after EmailService registration

#### SeekersController.cs
- Injected `IEmbeddingQueueService` into constructor
- **POST /api/seekers (register)**: Queues embedding request after successful seeker creation
- **PATCH /api/seekers/{id}**: Queues embedding request after successful seeker update
- Error handling: Logs failures but doesn't block registration/update

#### PositionsController.cs
- Injected `IEmbeddingQueueService` into constructor
- **POST /api/positions**: Queues embedding request after successful position creation
- **PATCH /api/positions/{id}**: Queues embedding request after successful position update
- Error handling: Logs warnings but doesn't block creation/update

## Configuration

### appsettings.json
```json
{
  "EmbeddingQueueName": "embedding-requests",
  "ConnectionStrings": {
    "BlobConnection": "DefaultEndpointsProtocol=https;AccountName=qafutureofthejobsearch;..."
  }
}
```

### NuGet Packages Added
- `Azure.Storage.Queues` (version 12.24.0)

## Message Format

Queue messages are serialized as JSON:

```json
{
  "entityType": "Candidate",  // or "Position"
  "entityId": "123"            // stringified integer ID
}
```

This format matches the expectations of the Python embedding service.

## Error Handling

All queue operations are wrapped in try-catch blocks:
- Seeker operations: Console.WriteLine for warnings
- Position operations: ILogger.LogWarning for better structured logging
- Main CRUD operations never fail due to queue issues (fire-and-forget pattern)

## Database Schema

Embedding tables created via migration `AddEmbeddingTables`:

### SeekerEmbeddings
- `Id` (int, PK)
- `SeekerId` (int, FK to Seekers with CASCADE DELETE)
- `Embedding` (varbinary(max) - stores byte[])
- `ModelVersion` (nvarchar(50))
- `CreatedAt` (datetime2)
- `UpdatedAt` (datetime2)
- Indexes: SeekerId, ModelVersion

### PositionEmbeddings
- `Id` (int, PK)
- `PositionId` (int, FK to Positions with CASCADE DELETE)
- `Embedding` (varbinary(max) - stores byte[])
- `ModelVersion` (nvarchar(50))
- `CreatedAt` (datetime2)
- `UpdatedAt` (datetime2)
- Indexes: PositionId, ModelVersion

## Testing Checklist

1. ✅ Build server successfully
2. ⏳ Create a new seeker → verify queue message appears
3. ⏳ Update a seeker → verify queue message appears
4. ⏳ Create a new position → verify queue message appears
5. ⏳ Update a position → verify queue message appears
6. ⏳ Check Azure Storage Queue in portal for messages
7. ⏳ Verify Python embedding service processes messages correctly

## Next Steps

1. **Test Queue Integration**
   - Create/update a seeker or position
   - Verify messages appear in Azure Storage Queue (check Azure Portal or use Storage Explorer)

2. **Python Embedding Service** (separate implementation)
   - Create Azure Function or service that listens to `embedding-requests` queue
   - Parse JSON messages to get entityType and entityId
   - Fetch full entity data from API
   - Generate embedding using ML model
   - Store embedding in SeekerEmbeddings or PositionEmbeddings table

3. **Optional: Manual Trigger Endpoint**
   - Create `server/Controllers/EmbeddingsController.cs`
   - Add POST /api/embeddings/request endpoint
   - Useful for reprocessing existing records or debugging

## Development Notes

- Queue connection reuses the BlobConnection string (Azure Storage accounts support both blobs and queues)
- Queue name is configurable via appsettings for different environments
- Service is registered as Singleton (QueueClient is thread-safe and recommended to be reused)
- Error handling is defensive - main operations never fail due to embedding queue issues
