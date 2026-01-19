using Azure.Storage.Blobs;
using Azure.Storage.Sas;
using Azure.Storage;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Azure.Identity;

namespace FutureOfTheJobSearch.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UploadsController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly ILogger<UploadsController> _logger;

        public UploadsController(IConfiguration config, ILogger<UploadsController> logger)
        {
            _config = config;
            _logger = logger;
        }

        private BlobServiceClient CreateBlobServiceClient()
        {
            var endpoint = _config["BlobEndpoint"] ?? Environment.GetEnvironmentVariable("BLOB_ENDPOINT");
            if (!string.IsNullOrWhiteSpace(endpoint))
            {
                return new BlobServiceClient(new Uri(endpoint), new DefaultAzureCredential());
            }

            var conn = _config.GetConnectionString("BlobConnection") ?? Environment.GetEnvironmentVariable("BLOB_CONNECTION");
            if (!string.IsNullOrWhiteSpace(conn))
            {
                return new BlobServiceClient(conn);
            }

            throw new InvalidOperationException("Blob storage not configured");
        }

        // Mint a fresh read SAS for an existing blob URL. Useful when a previously stored SAS expired.
        // GET api/uploads/sign?url={encodedBlobUrl}&minutes=60
        [HttpGet("sign")]
        public async Task<IActionResult> Sign([FromQuery] string url, [FromQuery] int minutes = 60)
        {
            if (string.IsNullOrEmpty(url)) return BadRequest(new { error = "No URL provided" });
            try
            {
                var uri = new Uri(url);
                var path = uri.AbsolutePath.TrimStart('/');
                if (path.Contains('?')) path = path.Split('?')[0];
                var partsPath = path.Split('/', 2, StringSplitOptions.RemoveEmptyEntries);
                if (partsPath.Length < 2) return BadRequest(new { error = "URL must include container and blob path" });
                var containerName = partsPath[0];
                var blobName = partsPath[1];

                var blobService = CreateBlobServiceClient();
                var blobContainerClient = blobService.GetBlobContainerClient(containerName);
                var blobClient = blobContainerClient.GetBlobClient(blobName);

                var startsOn = DateTimeOffset.UtcNow.AddMinutes(-5);
                var expiresOn = DateTimeOffset.UtcNow.AddMinutes(Math.Clamp(minutes, 1, 1440));

                var delegationKey = await blobService.GetUserDelegationKeyAsync(startsOn, expiresOn);
                var sasBuilder = new BlobSasBuilder
                {
                    BlobContainerName = containerName,
                    BlobName = blobName,
                    Resource = "b",
                    StartsOn = startsOn,
                    ExpiresOn = expiresOn
                };
                sasBuilder.SetPermissions(BlobSasPermissions.Read);
                var sasToken = sasBuilder.ToSasQueryParameters(delegationKey, blobService.AccountName).ToString();
                var signed = $"{blobClient.Uri}?{sasToken}";
                return Ok(new { url = signed });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to sign blob URL");
                return StatusCode(500, new { error = "Failed to sign URL", detail = ex.Message });
            }
        }

        public class DeleteFileRequest
        {
            public string Url { get; set; } = string.Empty;
        }

        [HttpPost("logo")]
        public async Task<IActionResult> UploadLogo([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { error = "No file provided" });
            var containerName = _config["BlobContainer"] ?? Environment.GetEnvironmentVariable("BLOB_CONTAINER") ?? "qalogos";
            BlobServiceClient blobService;
            try { blobService = CreateBlobServiceClient(); }
            catch (Exception ex) { _logger.LogError(ex, "Failed to initialize blob client"); return StatusCode(500, new { error = "Blob storage not configured", detail = ex.Message }); }

            var container = blobService.GetBlobContainerClient(containerName);
            await container.CreateIfNotExistsAsync();

            var blobName = $"logos/{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var blob = container.GetBlobClient(blobName);
            using (var stream = file.OpenReadStream())
            {
                await blob.UploadAsync(stream, overwrite: true);
            }

                // Return path-only reference (container/blob) for dynamic SAS signing
                var pathOnly = $"{containerName}/{blobName}";
                return Ok(new { url = pathOnly });
        }

        [HttpPost("resume")]
        public async Task<IActionResult> UploadResume([FromForm] IFormFile file)
        {
            return await UploadToContainer(file, _config["ResumeContainer"] ?? Environment.GetEnvironmentVariable("RESUME_CONTAINER") ?? (_config["BlobContainer"] ?? "qaresumes"));
        }

        [HttpPost("seeker-headshot")]
        public async Task<IActionResult> UploadSeekerHeadshot([FromForm] IFormFile file)
        {
            return await UploadToContainer(file, _config["SeekerHeadshotContainer"] ?? Environment.GetEnvironmentVariable("SEEKER_HEADSHOT_CONTAINER") ?? "qaseekerheadshot");
        }

        [HttpPost("poster-video")]
        public async Task<IActionResult> UploadPosterVideo([FromForm] IFormFile file)
        {
            return await UploadToContainer(file, _config["PosterVideoContainer"] ?? Environment.GetEnvironmentVariable("POSTER_VIDEO_CONTAINER") ?? (_config["BlobContainer"] ?? "qapostervideo"));
        }

        [HttpPost("seeker-video")]
        public async Task<IActionResult> UploadSeekerVideo([FromForm] IFormFile file)
        {
            return await UploadToContainer(file, _config["SeekerVideoContainer"] ?? Environment.GetEnvironmentVariable("SEEKER_VIDEO_CONTAINER") ?? (_config["BlobContainer"] ?? "qaseekervideo"));
        }

        [HttpDelete("delete-resume")]
        public async Task<IActionResult> DeleteResume([FromBody] DeleteFileRequest request)
        {
            if (string.IsNullOrEmpty(request?.Url)) return BadRequest(new { error = "No URL provided" });
            return await DeleteFromBlob(request.Url, _config["ResumeContainer"] ?? Environment.GetEnvironmentVariable("RESUME_CONTAINER") ?? (_config["BlobContainer"] ?? "qaresumes"));
        }

        [HttpDelete("delete-video")]
        public async Task<IActionResult> DeleteVideo([FromBody] DeleteFileRequest request)
        {
            if (string.IsNullOrEmpty(request?.Url)) return BadRequest(new { error = "No URL provided" });
            return await DeleteFromBlob(request.Url, _config["SeekerVideoContainer"] ?? Environment.GetEnvironmentVariable("SEEKER_VIDEO_CONTAINER") ?? (_config["BlobContainer"] ?? "qaseekervideo"));
        }

        [HttpDelete("delete-poster-video")]
        public async Task<IActionResult> DeletePosterVideo([FromBody] DeleteFileRequest request)
        {
            if (string.IsNullOrEmpty(request?.Url)) return BadRequest(new { error = "No URL provided" });
            return await DeleteFromBlob(request.Url, _config["PosterVideoContainer"] ?? Environment.GetEnvironmentVariable("POSTER_VIDEO_CONTAINER") ?? (_config["BlobContainer"] ?? "qapostervideo"));
        }

        [HttpDelete("delete-headshot")]
        public async Task<IActionResult> DeleteHeadshot([FromBody] DeleteFileRequest request)
        {
            if (string.IsNullOrEmpty(request?.Url)) return BadRequest(new { error = "No URL provided" });
            return await DeleteFromBlob(request.Url, _config["SeekerHeadshotContainer"] ?? Environment.GetEnvironmentVariable("SEEKER_HEADSHOT_CONTAINER") ?? "qaseekerheadshot");
        }

        private async Task<IActionResult> UploadToContainer(IFormFile file, string containerName)
        {
            if (file == null || file.Length == 0) return BadRequest(new { error = "No file provided" });
            BlobServiceClient blobService;
            try { blobService = CreateBlobServiceClient(); }
            catch (Exception ex) { return StatusCode(500, new { error = "Failed to initialize blob client", detail = ex.Message }); }

            var container = blobService.GetBlobContainerClient(containerName);
            await container.CreateIfNotExistsAsync();

            var blobName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var blob = container.GetBlobClient(blobName);
            
            // Set content type and disposition for inline viewing (especially for PDFs)
            var httpHeaders = new Azure.Storage.Blobs.Models.BlobHttpHeaders();
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            
            // Set proper content type
            if (ext == ".pdf") httpHeaders.ContentType = "application/pdf";
            else if (ext == ".jpg" || ext == ".jpeg") httpHeaders.ContentType = "image/jpeg";
            else if (ext == ".png") httpHeaders.ContentType = "image/png";
            else if (ext == ".gif") httpHeaders.ContentType = "image/gif";
            else if (ext == ".mp4") httpHeaders.ContentType = "video/mp4";
            else if (ext == ".mov") httpHeaders.ContentType = "video/quicktime";
            else if (ext == ".webm") httpHeaders.ContentType = "video/webm";
            else if (ext == ".doc") httpHeaders.ContentType = "application/msword";
            else if (ext == ".docx") httpHeaders.ContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            
            // Force inline disposition for PDFs and images so they display in browser instead of downloading
            if (ext == ".pdf" || ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif")
            {
                httpHeaders.ContentDisposition = "inline";
            }
            
            using (var stream = file.OpenReadStream()) 
            { 
                await blob.UploadAsync(stream, new Azure.Storage.Blobs.Models.BlobUploadOptions 
                { 
                    HttpHeaders = httpHeaders 
                }); 
            }

                // Return path-only reference (container/blob) for dynamic SAS signing
                var pathOnly = $"{containerName}/{blobName}";
                return Ok(new { url = pathOnly });
        }

        private async Task<IActionResult> DeleteFromBlob(string url, string containerName)
        {
            if (string.IsNullOrEmpty(url)) return BadRequest(new { error = "No URL provided" });
            BlobServiceClient blobService;
            try { blobService = CreateBlobServiceClient(); }
            catch (Exception ex) { return StatusCode(500, new { error = "Failed to initialize blob client", detail = ex.Message }); }

            try
            {
                // Extract blob name from URL
                var uri = new Uri(url);
                var blobName = uri.AbsolutePath.TrimStart('/');

                _logger.LogInformation($"🔄 Attempting to delete blob. Original URL: {url}");
                _logger.LogInformation($"📁 Container name: {containerName}");
                _logger.LogInformation($"📄 Initial blob name: {blobName}");

                // Remove container name from path if present
                if (blobName.StartsWith(containerName + "/"))
                {
                    blobName = blobName.Substring(containerName.Length + 1);
                    _logger.LogInformation($"✂️ Blob name after container removal: {blobName}");
                }

                // Remove SAS token if present
                if (blobName.Contains('?'))
                {
                    blobName = blobName.Split('?')[0];
                    _logger.LogInformation($"🔑 Blob name after SAS token removal: {blobName}");
                }

                // Additional cleanup - remove any double slashes or extra path segments
                blobName = blobName.Trim('/');
                _logger.LogInformation($"🧹 Final cleaned blob name: {blobName}");

                var container = blobService.GetBlobContainerClient(containerName);
                var blob = container.GetBlobClient(blobName);

                _logger.LogInformation($"🎯 Final blob client URI: {blob.Uri}");

                var response = await blob.DeleteIfExistsAsync();
                if (response.Value)
                {
                    _logger.LogInformation("✅ File deleted successfully");
                    return Ok(new { message = "File deleted successfully" });
                }
                else
                {
                    _logger.LogWarning("⚠️ File not found for deletion");
                    return NotFound(new { error = "File not found" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Failed to delete blob. URL: {url}, Container: {containerName}, Error: {ex.Message}");
                return StatusCode(500, new { error = "Failed to delete file", detail = ex.Message });
            }
        }
    }
}
