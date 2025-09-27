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

var builder = WebApplication.CreateBuilder(args);

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
if (!string.IsNullOrEmpty(azureSignalRConnection))
{
    builder.Services.AddSignalR().AddAzureSignalR(azureSignalRConnection);
    // Log which SignalR mode is being used so it's visible in startup logs.
    var usesMsi = azureSignalRConnection.IndexOf("AuthType=azure.msi", StringComparison.OrdinalIgnoreCase) >= 0;
    Console.WriteLine($"[Info] Azure SignalR configured. Mode={(usesMsi ? "Managed Identity (MSI)" : "AccessKey/ConnectionString")}");
}
else
{
    builder.Services.AddSignalR();
    Console.WriteLine("[Info] Azure SignalR not configured; using in-process SignalR.");
}

var app = builder.Build();

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

app.MapControllers();
app.MapHub<FutureOfTheJobSearch.Server.Hubs.ChatHub>("/hubs/chat");

app.Run();
