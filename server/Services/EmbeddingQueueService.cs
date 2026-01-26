using Azure.Storage.Queues;
using Azure.Identity;
using System.Text.Json;

namespace FutureOfTheJobSearch.Server.Services
{
    public interface IEmbeddingQueueService
    {
        Task QueueEmbeddingRequestAsync(string entityType, int entityId);
    }

    public class EmbeddingQueueService : IEmbeddingQueueService
    {
        private readonly QueueClient _queueClient;
        private readonly ILogger<EmbeddingQueueService> _logger;

        public EmbeddingQueueService(IConfiguration configuration, ILogger<EmbeddingQueueService> logger)
        {
            _logger = logger;
            var queueName = configuration["EmbeddingQueueName"] ?? "embedding-requests";
            
            // Try connection string first for local dev, fall back to managed identity for Azure
            var connectionString = configuration["AzureWebJobsStorage"] ?? configuration["StorageConnectionString"];
            
            if (!string.IsNullOrEmpty(connectionString))
            {
                _logger.LogInformation("Using connection string for queue: {QueueName}", queueName);
                _queueClient = new QueueClient(connectionString, queueName);
            }
            else
            {
                _logger.LogInformation("Using DefaultAzureCredential for queue: {QueueName}", queueName);
                // Use Azure Identity (DefaultAzureCredential) for Azure deployment
                var queueUri = new Uri($"https://futureofthejobsearcb26e.queue.core.windows.net/{queueName}");
                _queueClient = new QueueClient(queueUri, new DefaultAzureCredential());
            }
            
            _logger.LogInformation("EmbeddingQueueService initialized for queue: {QueueName}", queueName);
        }

        public async Task QueueEmbeddingRequestAsync(string entityType, int entityId)
        {
            try
            {
                var message = new
                {
                    entityType = entityType,
                    entityId = entityId.ToString()
                };

                var messageJson = JsonSerializer.Serialize(message);
                await _queueClient.SendMessageAsync(messageJson);
                
                _logger.LogInformation("Queued embedding request for {EntityType} {EntityId}", entityType, entityId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to queue embedding request for {EntityType} {EntityId}", entityType, entityId);
                // Don't throw - embedding generation is async and shouldn't block main operations
            }
        }
    }
}
