using Microsoft.AspNetCore.Mvc;
using FutureOfTheJobSearch.Server.Data;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Azure.Storage.Sas;
using Azure.Storage;
using Azure.Storage.Blobs;
using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Identity;
using FutureOfTheJobSearch.Server.Models;
using Microsoft.AspNetCore.Authentication;

namespace FutureOfTheJobSearch.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployersController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IConfiguration _config;
        private readonly ILogger<EmployersController> _logger;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;

        public EmployersController(ApplicationDbContext db, IConfiguration config, ILogger<EmployersController> logger, UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager)
        {
            _db = db;
            _config = config;
            _logger = logger;
            _userManager = userManager;
            _signInManager = signInManager;
        }

        [HttpPatch("{id}/logo")]
        public async Task<IActionResult> UpdateLogo([FromRoute] int id, [FromBody] UpdateLogoRequest req)
        {
            var emp = await _db.Employers.FirstOrDefaultAsync(e => e.Id == id);
            if (emp == null) return NotFound(new { error = "Employer not found" });
            emp.LogoUrl = req.LogoUrl;
            await _db.SaveChangesAsync();
            return Ok(new { message = "Logo updated" });
        }

        // Returns a short-lived read-only SAS URL for the employer logo.
        // Caller must be authenticated and must own the employer record.
        [HttpGet("{id}/logo-sas")]
        [Authorize]
        public async Task<IActionResult> GetLogoSas([FromRoute] int id)
        {
            var emp = await _db.Employers.FirstOrDefaultAsync(e => e.Id == id);
            if (emp == null) return NotFound(new { error = "Employer not found" });

            // Ensure caller owns this employer
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userId) || emp.UserId != userId)
            {
                return Forbid();
            }

            if (string.IsNullOrEmpty(emp.LogoUrl)) return NotFound(new { error = "No logo set for this employer" });

            // If the stored URL already contains a query string (likely a SAS) return it.
            if (emp.LogoUrl.Contains("?")) return Ok(new { url = emp.LogoUrl });

            // Try to construct a SAS based on the stored URL or blob path
            var conn = _config.GetConnectionString("BlobConnection") ?? Environment.GetEnvironmentVariable("BLOB_CONNECTION");
            var defaultContainer = _config["BlobContainer"] ?? Environment.GetEnvironmentVariable("BLOB_CONTAINER") ?? "qalogos";

            // Determine container and blob name from LogoUrl
            string containerName = defaultContainer;
            string blobName;
            try
            {
                if (Uri.IsWellFormedUriString(emp.LogoUrl, UriKind.Absolute))
                {
                    var uri = new Uri(emp.LogoUrl);
                    var segments = uri.AbsolutePath.Trim('/').Split('/');
                    if (segments.Length < 2)
                    {
                        blobName = string.Join('/', segments);
                    }
                    else
                    {
                        containerName = segments[0];
                        blobName = string.Join('/', segments.Skip(1));
                    }
                }
                else
                {
                    // treat as blob name within default container
                    blobName = emp.LogoUrl.TrimStart('/');
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse stored LogoUrl; returning raw value");
                return Ok(new { url = emp.LogoUrl });
            }

            if (string.IsNullOrEmpty(conn))
            {
                // No connection string available; return stored url (may not be accessible)
                return Ok(new { url = emp.LogoUrl });
            }

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

                var blobClient = new BlobClient(conn, containerName, blobName);

                if (!string.IsNullOrEmpty(acctName) && !string.IsNullOrEmpty(acctKey))
                {
                    var credential = new StorageSharedKeyCredential(acctName, acctKey);
                    var sasBuilder = new BlobSasBuilder
                    {
                        BlobContainerName = containerName,
                        BlobName = blobName,
                        Resource = "b",
                        ExpiresOn = DateTimeOffset.UtcNow.AddHours(1)
                    };
                    sasBuilder.SetPermissions(BlobSasPermissions.Read);
                    var sasToken = sasBuilder.ToSasQueryParameters(credential).ToString();
                    var resultUrl = blobClient.Uri + "?" + sasToken;
                    return Ok(new { url = resultUrl });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to create SAS token for stored logo; returning stored value");
            }

            // Fallback: return the stored LogoUrl
            return Ok(new { url = emp.LogoUrl });
        }

        // Update general employer fields
        [HttpPatch("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateEmployer([FromRoute] int id, [FromBody] UpdateEmployerRequest req)
        {
            var emp = await _db.Employers.FirstOrDefaultAsync(e => e.Id == id);
            if (emp == null) return NotFound(new { error = "Employer not found" });

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userId) || emp.UserId != userId) return Forbid();

            // Apply allowed updates
            emp.CompanyName = req.CompanyName ?? emp.CompanyName;
            emp.Website = req.Website ?? emp.Website;
            emp.ContactName = req.ContactName ?? emp.ContactName;
            emp.ContactEmail = req.ContactEmail ?? emp.ContactEmail;
            emp.CompanyDescription = req.CompanyDescription ?? emp.CompanyDescription;
            emp.Address = req.Address ?? emp.Address;
            emp.City = req.City ?? emp.City;
            emp.State = req.State ?? emp.State;
            if (!string.IsNullOrWhiteSpace(req.CompanySize) && Enum.TryParse<CompanySize>(req.CompanySize, true, out var size)) emp.CompanySize = size;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Employer updated", employer = emp });
        }

        // Delete employer account and user (and attempt to delete logo blob if present)
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteEmployer([FromRoute] int id)
        {
            var emp = await _db.Employers.FirstOrDefaultAsync(e => e.Id == id);
            if (emp == null) return NotFound(new { error = "Employer not found" });

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userId) || emp.UserId != userId) return Forbid();

            // Attempt to delete blob if LogoUrl present and parseable
            if (!string.IsNullOrEmpty(emp.LogoUrl))
            {
                try
                {
                    var conn = _config.GetConnectionString("BlobConnection") ?? Environment.GetEnvironmentVariable("BLOB_CONNECTION");
                    var containerName = _config["BlobContainer"] ?? Environment.GetEnvironmentVariable("BLOB_CONTAINER") ?? "qalogos";
                    if (!string.IsNullOrEmpty(conn))
                    {
                        // try to derive container/blob from stored URL
                        string blobName;
                        if (Uri.IsWellFormedUriString(emp.LogoUrl, UriKind.Absolute))
                        {
                            var uri = new Uri(emp.LogoUrl);
                            var segments = uri.AbsolutePath.Trim('/').Split('/');
                            if (segments.Length >= 2) { containerName = segments[0]; blobName = string.Join('/', segments.Skip(1)); }
                            else blobName = string.Join('/', segments);
                        }
                        else blobName = emp.LogoUrl.TrimStart('/');

                        var parts = conn.Split(';', StringSplitOptions.RemoveEmptyEntries);
                        var acctName = string.Empty; var acctKey = string.Empty;
                        foreach (var p in parts)
                        {
                            var kv = p.Split('=', 2);
                            if (kv.Length != 2) continue;
                            var k = kv[0].Trim(); var v = kv[1].Trim();
                            if (k.Equals("AccountName", StringComparison.OrdinalIgnoreCase)) acctName = v;
                            if (k.Equals("AccountKey", StringComparison.OrdinalIgnoreCase)) acctKey = v;
                        }
                        if (!string.IsNullOrEmpty(acctName) && !string.IsNullOrEmpty(acctKey))
                        {
                            var blobClient = new BlobClient(conn, containerName, blobName);
                            await blobClient.DeleteIfExistsAsync();
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete logo blob for employer {EmployerId}", id);
                }
            }

            // remove employer record
            _db.Employers.Remove(emp);
            await _db.SaveChangesAsync();

            // remove identity user
            try
            {
                var user = await _userManager.FindByIdAsync(emp.UserId);
                if (user != null)
                {
                    await _signInManager.SignOutAsync();
                    var del = await _userManager.DeleteAsync(user);
                    if (!del.Succeeded) _logger.LogWarning("Failed to delete user {UserId}: {Errors}", user.Id, string.Join(',', del.Errors.Select(er => er.Description)));
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete identity user for employer {EmployerId}", id);
            }

            return Ok(new { message = "Employer and user deleted" });
        }
    }

    public class UpdateLogoRequest { public string LogoUrl { get; set; } }

    public class UpdateEmployerRequest
    {
        public string? CompanyName { get; set; }
        public string? Website { get; set; }
        public string? ContactName { get; set; }
        public string? ContactEmail { get; set; }
        public string? CompanyDescription { get; set; }
        public string? CompanySize { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Address { get; set; }
    }
}
