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
using Azure.Identity;

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
            },
            OnAuthenticationFailed = context =>
            {
                var logger = context.HttpContext.RequestServices.GetService<ILoggerFactory>()?.CreateLogger("JwtAuth");
                logger?.LogWarning(context.Exception, "JWT authentication failed. Path={Path}", context.Request.Path);
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                if (!string.IsNullOrEmpty(context.Error) || !string.IsNullOrEmpty(context.ErrorDescription))
                {
                    var logger = context.HttpContext.RequestServices.GetService<ILoggerFactory>()?.CreateLogger("JwtAuth");
                    logger?.LogInformation("JWT challenge triggered. Error={Error}, Description={Description}, Path={Path}", context.Error, context.ErrorDescription, context.Request.Path);
                }
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                var logger = context.HttpContext.RequestServices.GetService<ILoggerFactory>()?.CreateLogger("JwtAuth");
                logger?.LogDebug("JWT token validated for subject {Subject}", context.Principal?.FindFirst("sub")?.Value ?? context.Principal?.Identity?.Name);
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

// SignalR and Azure SignalR configuration (reads AZURE_SIGNALR_CONNECTIONSTRING or AZURE_SIGNALR_ENDPOINT)
var azureSignalRConnection = configuration["Azure:SignalR:ConnectionString"] ?? Environment.GetEnvironmentVariable("AZURE_SIGNALR_CONNECTIONSTRING");
var azureSignalREndpoint = configuration["Azure:SignalR:Endpoint"] ?? Environment.GetEnvironmentVariable("AZURE_SIGNALR_ENDPOINT");

// Helper to detect connection-string form (do not expose secrets)
string Mask(string? s) {
    if (string.IsNullOrEmpty(s)) return "(none)";
    if (s.Length <= 32) return new string('*', s.Length);
    return s.Substring(0, 16) + "..." + s.Substring(s.Length - 8);
}

var azureSignalRKind = "none";
if (!string.IsNullOrEmpty(azureSignalRConnection))
{
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
        azureSignalRKind = "unknown-format";
    }
}
else if (!string.IsNullOrEmpty(azureSignalREndpoint))
{
    azureSignalRKind = "endpoint-only-env";
}

Console.WriteLine("[Startup] Azure SignalR config kind: " + azureSignalRKind);
Console.WriteLine("[Startup] AZURE_SIGNALR_CONNECTIONSTRING (masked): " + Mask(azureSignalRConnection));
Console.WriteLine("[Startup] AZURE_SIGNALR_ENDPOINT (masked): " + Mask(azureSignalREndpoint));

// Helper to extract Endpoint URL from either "Endpoint=...;..." connection string or AZURE_SIGNALR_ENDPOINT value
string? ExtractEndpointUrl(string? connOrEndpoint)
{
	// Accept either raw endpoint URL or a semi-colon key=value string containing "Endpoint="
	if (string.IsNullOrEmpty(connOrEndpoint)) return null;
	// If the string already looks like a URL, return it
	if (connOrEndpoint.StartsWith("https://", StringComparison.OrdinalIgnoreCase) || connOrEndpoint.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
	{
		// Some envs store: "Endpoint=https://...;AuthType=azure.msi;..."
		// In that case, the string may still contain "Endpoint=" prefix; handle below.
	}
	// Try to parse "Endpoint=..." style
    var parts = connOrEndpoint.Split(';', StringSplitOptions.RemoveEmptyEntries);
	foreach (var p in parts)
	{
		var kv = p.Split('=', 2);
		if (kv.Length == 2 && kv[0].Trim().Equals("Endpoint", StringComparison.OrdinalIgnoreCase))
		{
			return kv[1].Trim().TrimEnd('/');
		}
	}
	// If no key/value form, but the string contains "https://", attempt to locate it
	var httpsIndex = connOrEndpoint.IndexOf("https://", StringComparison.OrdinalIgnoreCase);
	if (httpsIndex >= 0)
	{
		var end = connOrEndpoint.IndexOf(';', httpsIndex);
		return end > httpsIndex ? connOrEndpoint.Substring(httpsIndex, end - httpsIndex).TrimEnd('/') : connOrEndpoint.Substring(httpsIndex).TrimEnd('/');
	}
	// Last resort, return the original string (may be a plain endpoint)
	return connOrEndpoint;
}

// Determine form of SignalR configuration (masked diagnostics already printed above)
// Build ServiceManager with Managed Identity when endpoint-only is provided (Management SDK v1.8.0)
var signalRBuilder = builder.Services.AddSignalR();
var useAzureSignalR = false;

if (azureSignalRKind == "connection-string-with-accesskey")
{
	// Access-key path: use AddAzureSignalR with connection string (safe & tested)
	try
	{
		signalRBuilder.AddAzureSignalR(options =>
		{
			options.ConnectionString = azureSignalRConnection;
		});
		useAzureSignalR = true;
		Console.WriteLine("[Info] AddAzureSignalR called (access-key path).");
	}
	catch (Exception ex)
	{
		Console.WriteLine("[Warn] AddAzureSignalR failed: " + ex.Message);
		// fallback to in-process SignalR (signalRBuilder already added)
	}
}
else if (azureSignalRKind == "endpoint-only-env" || azureSignalRKind == "endpoint-only-in-connection-string")
{
	// Endpoint-only / Managed Identity path using Management SDK v1.8.0
	try
	{
		var endpointSource = !string.IsNullOrEmpty(azureSignalREndpoint) ? azureSignalREndpoint : azureSignalRConnection;
		var endpointUrl = ExtractEndpointUrl(endpointSource);
		if (string.IsNullOrEmpty(endpointUrl))
		{
			Console.WriteLine("[Warn] Azure SignalR endpoint could not be parsed for Managed Identity path.");
		}
        else
        {
            // Use system-assigned managed identity credential
            var credential = new DefaultAzureCredential();
            Console.WriteLine("[Info] Using system-assigned managed identity for Azure SignalR.");

            signalRBuilder.AddAzureSignalR(options =>
            {
                options.Endpoints = new[]
                {
                    new ServiceEndpoint(new Uri(endpointUrl), credential)
                };
            });
            useAzureSignalR = true;
            Console.WriteLine("[Info] Azure SignalR endpoint registered with managed identity credential.");
        }
	}
	catch (Exception ex)
	{
		Console.WriteLine("[Error] Failed to configure Azure SignalR with Managed Identity: " + ex.Message);
		Console.WriteLine("[Error] Falling back to in-process SignalR. Ensure Managed Identity is enabled and SignalR role assignments are in place.");
		// fallback: in-process SignalR already registered
	}
}
else
{
	// No Azure SignalR config or unknown format: remain in-process
	Console.WriteLine("[Info] No usable Azure SignalR configuration found - using in-process SignalR.");
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

// Add routing so endpoint metadata is available to auth middleware
app.UseRouting();

// CORS must run after UseRouting when using endpoint routing
app.UseCors("AllowLocalhost");

// In Development we avoid automatic HTTPS redirection to prevent preflight CORS requests
// from being redirected (redirect responses typically don't include CORS headers).
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Diagnostic middleware: log (masked) Authorization header and identity for API requests
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        var authHdr = context.Request.Headers["Authorization"].FirstOrDefault();
        string Mask(string? s)
        {
            if (string.IsNullOrEmpty(s)) return "(none)";
            if (s.Length <= 32) return new string('*', s.Length);
            return s.Substring(0, 8) + "..." + s.Substring(s.Length - 8);
        }
        Console.WriteLine($"[Request] {context.Request.Method} {context.Request.Path} Authorization: {Mask(authHdr)}");
        var user = context.User?.Identity;
        Console.WriteLine($"[Request] User.Identity IsAuthenticated={user?.IsAuthenticated}, Name={user?.Name}");
    }
    await next();
});

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
		app.UseAzureSignalR(routes =>
		{
			routes.MapHub<FutureOfTheJobSearch.Server.Hubs.ChatHub>("/hubs/chat");
		});
		Console.WriteLine("[Info] App configured to use Azure SignalR runtime.");
	}
	catch (Exception ex)
	{
		Console.WriteLine("[Warn] UseAzureSignalR failed at runtime: " + ex.Message);
		app.MapHub<FutureOfTheJobSearch.Server.Hubs.ChatHub>("/hubs/chat");
		Console.WriteLine("[Info] Fallback to in-process MapHub for /hubs/chat");
	}
}
else
{
	app.MapHub<FutureOfTheJobSearch.Server.Hubs.ChatHub>("/hubs/chat");
	Console.WriteLine("[Info] In-process SignalR hub mapped at /hubs/chat");
}

app.Run();