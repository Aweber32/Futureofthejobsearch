using Azure.Storage.Blobs;
using Azure.Storage.Sas;
using Azure.Storage;
using System.Linq;
using Microsoft.AspNetCore.Mvc;

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

        [HttpPost("logo")]
        public async Task<IActionResult> UploadLogo([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { error = "No file provided" });

            var conn = _config.GetConnectionString("BlobConnection") ?? Environment.GetEnvironmentVariable("BLOB_CONNECTION");
            var containerName = _config["BlobContainer"] ?? Environment.GetEnvironmentVariable("BLOB_CONTAINER") ?? "qalogos";
            if (string.IsNullOrEmpty(conn)) return StatusCode(500, new { error = "Blob storage not configured" });

            BlobServiceClient blobService;
            try
            {
                blobService = new BlobServiceClient(conn);
            }
            catch (FormatException fex)
            {
                _logger.LogError(fex, "Invalid blob storage connection string");
                return StatusCode(500, new { error = "Invalid blob storage connection string", detail = fex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create BlobServiceClient");
                return StatusCode(500, new { error = "Failed to initialize blob client", detail = ex.Message });
            }

            var container = blobService.GetBlobContainerClient(containerName);
            await container.CreateIfNotExistsAsync();

            var blobName = $"logos/{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var blob = container.GetBlobClient(blobName);
            using (var stream = file.OpenReadStream())
            {
                await blob.UploadAsync(stream, overwrite: true);
            }

            // Return a temporary SAS URL so blobs can be read even when public access is disabled
            string resultUrl = blob.Uri.ToString();
            try
            {
                // parse account name/key from connection string
                var acctName = string.Empty;
                var acctKey = string.Empty;
                var parts = conn.Split(';', StringSplitOptions.RemoveEmptyEntries);
                foreach (var p in parts)
                {
                    var kv = p.Split('=', 2);
                    if (kv.Length != 2) continue;
                    var k = kv[0].Trim();
                    var v = kv[1].Trim();
                    if (k.Equals("AccountName", StringComparison.OrdinalIgnoreCase)) acctName = v;
                    if (k.Equals("AccountKey", StringComparison.OrdinalIgnoreCase)) acctKey = v;
                }

                if (!string.IsNullOrEmpty(acctName) && !string.IsNullOrEmpty(acctKey))
                {
                    var credential = new StorageSharedKeyCredential(acctName, acctKey);
                    var sasBuilder = new BlobSasBuilder
                    {
                        BlobContainerName = containerName,
                        BlobName = blobName,
                        Resource = "b",
                        ExpiresOn = DateTimeOffset.UtcNow.AddDays(7)
                    };
                    sasBuilder.SetPermissions(BlobSasPermissions.Read);
                    var sasToken = sasBuilder.ToSasQueryParameters(credential).ToString();
                    resultUrl = blob.Uri + "?" + sasToken;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to create SAS token for blob; returning direct URI which may not be publicly accessible");
            }

            return Ok(new { url = resultUrl });
        }

        [HttpPost("resume")]
        public async Task<IActionResult> UploadResume([FromForm] IFormFile file)
        {
            return await UploadToContainer(file, _config["ResumeContainer"] ?? Environment.GetEnvironmentVariable("RESUME_CONTAINER") ?? (_config["BlobContainer"] ?? "qaresumes"));
        }

        [HttpPost("seeker-video")]
        public async Task<IActionResult> UploadSeekerVideo([FromForm] IFormFile file)
        {
            return await UploadToContainer(file, _config["SeekerVideoContainer"] ?? Environment.GetEnvironmentVariable("SEEKER_VIDEO_CONTAINER") ?? (_config["BlobContainer"] ?? "qaseekervideo"));
        }

        [HttpPost("poster-video")]
        public async Task<IActionResult> UploadPosterVideo([FromForm] IFormFile file)
        {
            return await UploadToContainer(file, _config["PosterVideoContainer"] ?? Environment.GetEnvironmentVariable("POSTER_VIDEO_CONTAINER") ?? (_config["BlobContainer"] ?? "qapostervideo"));
        }

        private async Task<IActionResult> UploadToContainer(IFormFile file, string containerName)
        {
            if (file == null || file.Length == 0) return BadRequest(new { error = "No file provided" });

            var conn = _config.GetConnectionString("BlobConnection") ?? Environment.GetEnvironmentVariable("BLOB_CONNECTION");
            if (string.IsNullOrEmpty(conn)) return StatusCode(500, new { error = "Blob storage not configured" });

            BlobServiceClient blobService;
            try { blobService = new BlobServiceClient(conn); }
            catch (Exception ex) { return StatusCode(500, new { error = "Failed to initialize blob client", detail = ex.Message }); }

            var container = blobService.GetBlobContainerClient(containerName);
            await container.CreateIfNotExistsAsync();

            var blobName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var blob = container.GetBlobClient(blobName);
            using (var stream = file.OpenReadStream()) { await blob.UploadAsync(stream, overwrite: true); }

            string resultUrl = blob.Uri.ToString();
            try
            {
                var acctName = string.Empty; var acctKey = string.Empty;
                var parts = conn.Split(';', StringSplitOptions.RemoveEmptyEntries);
                foreach (var p in parts)
                {
                    var kv = p.Split('=', 2); if (kv.Length != 2) continue; var k = kv[0].Trim(); var v = kv[1].Trim();
                    if (k.Equals("AccountName", StringComparison.OrdinalIgnoreCase)) acctName = v;
                    if (k.Equals("AccountKey", StringComparison.OrdinalIgnoreCase)) acctKey = v;
                }
                if (!string.IsNullOrEmpty(acctName) && !string.IsNullOrEmpty(acctKey))
                {
                    var credential = new StorageSharedKeyCredential(acctName, acctKey);
                    var sasBuilder = new BlobSasBuilder { BlobContainerName = containerName, BlobName = blobName, Resource = "b", ExpiresOn = DateTimeOffset.UtcNow.AddDays(7) };
                    sasBuilder.SetPermissions(BlobSasPermissions.Read);
                    var sasToken = sasBuilder.ToSasQueryParameters(credential).ToString();
                    resultUrl = blob.Uri + "?" + sasToken;
                }
            }
            catch (Exception) { /* fallback to direct URI */ }

            return Ok(new { url = resultUrl });
        }
    }
}
