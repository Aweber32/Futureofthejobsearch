using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using FutureOfTheJobSearch.Server.Data;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using FutureOfTheJobSearch.Server.Models;
using System.Text.Json.Serialization;
using Microsoft.Azure.SignalR; // added for Azure SignalR extensions
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

// Ensure logging providers are configured early so startup errors appear in Log Stream / docker logs
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// Configuration
var configuration = builder.Configuration;

// Add services
builder.Services.AddControllers()
    .AddJsonOptions(opts => {
        // Avoid circular reference serialization exceptions when returning entities with navigation properties
        opts.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        // keep default behaviour for property naming and depth
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// DbContext - connection string must come from appsettings or environment (use Azure DefaultConnection)
var conn = configuration.GetConnectionString("DefaultConnection") ?? Environment.GetEnvironmentVariable("DEFAULT_CONNECTION");
if (string.IsNullOrEmpty(conn))
{
    throw new InvalidOperationException("No DefaultConnection configured. Set 'ConnectionStrings:DefaultConnection' in appsettings.json or the 'DEFAULT_CONNECTION' environment variable to your Azure SQL connection string.");
}

// Log some startup diagnostic information (mask secrets)
try
{
    Console.WriteLine("[Startup] Environment: " + builder.Environment.EnvironmentName);
    Console.WriteLine("[Startup] DefaultConnection present: " + (!string.IsNullOrEmpty(conn)));
    var maskedConn = conn.Length > 20 ? conn.Substring(0, 20) + "..." : conn;
    Console.WriteLine("[Startup] DefaultConnection (masked): " + maskedConn);
    var jwtKeyPresent = !string.IsNullOrEmpty(configuration["Jwt:Key"]) || !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("JWT_KEY"));
    Console.WriteLine("[Startup] Jwt:Key present: " + jwtKeyPresent);
    var azureSignalRConnectionPresent = !string.IsNullOrEmpty(configuration["Azure:SignalR:ConnectionString"] ?? Environment.GetEnvironmentVariable("AZURE_SIGNALR_CONNECTIONSTRING"));
    Console.WriteLine("[Startup] AZURE_SIGNALR_CONNECTIONSTRING present: " + azureSignalRConnectionPresent);
}
catch (Exception ex)
{
    Console.WriteLine("[Warn] Failed to write startup diagnostics: " + ex.Message);
}

// If AZURE_SQL_USER/AZURE_SQL_PASSWORD are provided, prefer building a SQL-auth connection
// from the given connection string so local dev can connect to the existing Azure SQL DB.
var sqlUser = Environment.GetEnvironmentVariable("AZURE_SQL_USER");
var sqlPwd = Environment.GetEnvironmentVariable("AZURE_SQL_PASSWORD");
if (!string.IsNullOrEmpty(sqlUser) && !string.IsNullOrEmpty(sqlPwd))
{
    try
    {
        var csb = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(conn);
        if (csb.ContainsKey("Authentication")) csb.Remove("Authentication");
        csb.UserID = sqlUser;
        csb.Password = sqlPwd;
        conn = csb.ConnectionString;
        Console.WriteLine("[Info] Using AZURE_SQL_USER/AZURE_SQL_PASSWORD for Azure SQL connection.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Warn] Failed to apply AZURE_SQL_USER fallback: {ex.Message}");
    }
}

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(conn));

builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options => {
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = false;
})
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// Configure cookie authentication for Identity
builder.Services.ConfigureApplicationCookie(options => {
    options.Cookie.HttpOnly = true;
    // Allow cross-site cookie for credentialed requests from the frontend
    options.Cookie.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.None;
    // Require secure cookie delivery
    options.Cookie.SecurePolicy = Microsoft.AspNetCore.Http.CookieSecurePolicy.Always;
    options.LoginPath = "/poster/login"; // not used by API but helpful
});

// CORS for local dev and production
builder.Services.AddCors(options => {
    options.AddPolicy("AllowLocalhost", policy => {
        var allowedOrigins = new List<string> { "http://localhost:3000" };
        // Add production frontend URL when not in development
        if (!builder.Environment.IsDevelopment())
        {
            allowedOrigins.Add("https://futureofthejobsearch-d3d3fad4c2h4g4hc.centralus-01.azurewebsites.net");
        }

        policy.WithOrigins(allowedOrigins.ToArray())
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Blob storage settings: read from ConnectionStrings:BlobConnection or env BLOB_CONNECTION
// and optional BlobContainer or env BLOB_CONTAINER (defaults to 'logos')
var blobConnection = configuration.GetConnectionString("BlobConnection") ?? Environment.GetEnvironmentVariable("BLOB_CONNECTION");
var blobContainer = configuration["BlobContainer"] ?? Environment.GetEnvironmentVariable("BLOB_CONTAINER") ?? "qalogos";

// JWT settings - key should come from env var in production
var jwtKey = configuration["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
var jwtIssuer = configuration["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "futureofthejobsearch";
if (string.IsNullOrEmpty(jwtKey))
{
    // development fallback key (do NOT use in production)
    jwtKey = "dev-secret-change-this-please-set-JWT_KEY";
}
var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

// Make JWT the default authentication scheme for API requests so unauthenticated API calls return 401
builder.Services.AddAuthentication(options => {
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
            // Use the 'sub' claim as the Name claim so SignalR's Context.UserIdentifier is populated
            NameClaimType = "sub",
            ClockSkew = TimeSpan.FromMinutes(1)
        };
        // Allow JWT token passed in query string for SignalR client connections
        options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"].FirstOrDefault();
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && (path.StartsWithSegments("/hubs/chat")))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

// ensure API requests are not redirected to login by cookie middleware
builder.Services.ConfigureApplicationCookie(options => {
    options.Cookie.HttpOnly = true;
    // Allow cross-site cookie for credentialed requests from the frontend
    options.Cookie.SameSite = SameSiteMode.None;
    // Require secure cookie delivery
    options.Cookie.SecurePolicy = Microsoft.AspNetCore.Http.CookieSecurePolicy.Always;
    options.LoginPath = "/poster/login"; // not used by API but helpful
    options.Events = new CookieAuthenticationEvents
    {
        OnRedirectToLogin = ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/api") || ctx.Request.Headers["Accept"].ToString().Contains("application/json"))
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            }
            ctx.Response.Redirect(ctx.RedirectUri);
            return Task.CompletedTask;
        }
    };
});

// SignalR and Azure SignalR (configured via Azure:SignalR:ConnectionString or env AZURE_SIGNALR_CONNECTIONSTRING)
var azureSignalRConnection = configuration["Azure:SignalR:ConnectionString"] ?? Environment.GetEnvironmentVariable("AZURE_SIGNALR_CONNECTIONSTRING");

// Diagnostics: detect whether the configured value looks like a full connection string (contains AccessKey),
// an endpoint-only value (endpoint but no key), or is missing (likely relying on Managed Identity).
var azureSignalREndpoint = configuration["Azure:SignalR:Endpoint"] ?? Environment.GetEnvironmentVariable("AZURE_SIGNALR_ENDPOINT");
var azureSignalRKind = "none";
if (!string.IsNullOrEmpty(azureSignalRConnection))
{
    // quick heuristic checks
    if (azureSignalRConnection.IndexOf("AccessKey=", StringComparison.OrdinalIgnoreCase) >= 0
        || azureSignalRConnection.IndexOf("accesskey=", StringComparison.OrdinalIgnoreCase) >= 0)
    {
        azureSignalRKind = "connection-string-with-accesskey";
    }
    else if (azureSignalRConnection.IndexOf("Endpoint=", StringComparison.OrdinalIgnoreCase) >= 0)
    {
        azureSignalRKind = "endpoint-only-in-connection-string";
    }
    else
    {
        // Could be endpoint-only value or other form; mark as unknown
        azureSignalRKind = "unknown-format";
    }
}
else if (!string.IsNullOrEmpty(azureSignalREndpoint))
{
    azureSignalRKind = "endpoint-only-env";
}

// Masking helper for logs (do not reveal keys)
string Mask(string s)
{
    if (string.IsNullOrEmpty(s)) return "(none)";
    if (s.Length <= 32) return new string('*', s.Length);
    return s.Substring(0, 16) + "..." + s.Substring(s.Length - 8);
}

// Log what we found (masked) so platform log-stream or CI shows intent without exposing secrets
Console.WriteLine("[Startup] Azure SignalR configuration kind: " + azureSignalRKind);
Console.WriteLine("[Startup] AZURE_SIGNALR_CONNECTIONSTRING (masked): " + Mask(azureSignalRConnection));
Console.WriteLine("[Startup] AZURE_SIGNALR_ENDPOINT (masked): " + Mask(azureSignalREndpoint));

// Guidance note for operators in logs
if (azureSignalRKind == "endpoint-only-in-connection-string" || azureSignalRKind == "endpoint-only-env" || azureSignalRKind == "unknown-format")
{
    Console.WriteLine("[Startup] Note: SignalR config appears endpoint-only / AAD-managed. Ensure Managed Identity is enabled for the App Service/VM and that the SDK/package version supports AAD auth for Azure SignalR.");
    Console.WriteLine("[Startup] Note: If you expect to use AccessKey-based auth, set AZURE_SIGNALR_CONNECTIONSTRING to the full connection string (Endpoint=...;AccessKey=...;).");
}
else if (azureSignalRKind == "connection-string-with-accesskey")
{
    Console.WriteLine("[Startup] Note: Using AccessKey-based Azure SignalR connection (recommended for testing). Do NOT check keys into source control.");
}

// Add a flag so we know later whether Azure SignalR was successfully configured
var useAzureSignalR = false;
if (!string.IsNullOrEmpty(azureSignalRConnection))
{
    try
    {
        // Correct: get the ISignalRServerBuilder from AddSignalR(), then call AddAzureSignalR(...) on it.
        var signalRBuilder = builder.Services.AddSignalR();
        signalRBuilder.AddAzureSignalR(options =>
        {
            options.ConnectionString = azureSignalRConnection;
        });
        useAzureSignalR = true;
        Console.WriteLine("[Info] Azure SignalR configured (AddAzureSignalR called).");
    }
    catch (Exception ex)
    {
        // Log and fall back to in-process SignalR
        Console.WriteLine($"[Error] Azure SignalR initialization failed: {ex.Message}");
        Console.WriteLine("[Error] Falling back to in-process SignalR. Fix AZURE_SIGNALR_CONNECTIONSTRING or enable Managed Identity properly to enable Azure SignalR.");
        // Ensure SignalR is still registered
        builder.Services.AddSignalR();
    }
}
else if (!string.IsNullOrEmpty(azureSignalREndpoint))
{
    // Endpoint-only detected. We do NOT move keys into code.
    // If you want AAD/Managed Identity auth here, implement the Management SDK + DefaultAzureCredential flow explicitly.
    Console.WriteLine("[Info] Endpoint-only detected; not calling AddAzureSignalR with connection string. To use AAD/Managed Identity, implement the Management SDK with DefaultAzureCredential.");
    builder.Services.AddSignalR();
}
else
{
    builder.Services.AddSignalR();
}

var app = builder.Build();

// small diagnostic so log stream shows whether Azure SignalR was configured
var logger = app.Services.GetService<ILoggerFactory>()?.CreateLogger("Startup");
logger?.LogInformation("useAzureSignalR = {useAzureSignalR}", useAzureSignalR);
Console.WriteLine("[Startup] useAzureSignalR = " + useAzureSignalR);

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowLocalhost");
// In Development we avoid automatic HTTPS redirection to prevent preflight CORS requests
// from being redirected (redirect responses typically don't include CORS headers).
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseAuthentication();
app.UseAuthorization();

// Add this so attribute-routed API controllers (e.g. /api/seekers/login) are reachable
app.MapControllers();
Console.WriteLine("[Startup] Mapped controllers");

// Map SignalR hub using Azure SignalR pipeline when configured, otherwise use in-process mapping
if (useAzureSignalR)
{
    try
    {
        // Use the Azure SignalR middleware to map hubs
        app.UseAzureSignalR(routes =>
        {
            routes.MapHub<FutureOfTheJobSearch.Server.Hubs.ChatHub>("/hubs/chat");
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Warn] Failed to call UseAzureSignalR: {ex.Message}");
        Console.WriteLine("[Warn] Falling back to in-process MapHub.");
        app.MapHub<FutureOfTheJobSearch.Server.Hubs.ChatHub>("/hubs/chat");
    }
}
else
{
    app.MapHub<FutureOfTheJobSearch.Server.Hubs.ChatHub>("/hubs/chat");
}

app.Run();
