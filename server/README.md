# Server — FutureOfTheJobSearch API

This folder contains an ASP.NET Core Web API using Identity + EF Core and SQL Server.  

Quick start (local): 

- Ensure .NET 7 SDK is installed.
- From `server/` set a connection string in environment or `appsettings.json`.
- For the API to connect locally run the below script
az login
$env:ConnectionStrings__DefaultConnection = "Server=...;Database=...;Authentication=Active Directory Default;..."
cd server
dotnet run
# dotnet will see ConnectionStrings__DefaultConnection for the lifetime of this shell session

Example (PowerShell):

```powershell
$env:DEFAULT_CONNECTION = "Server=(localdb)\\mssqllocaldb;Database=FJS_dev;Trusted_Connection=True;MultipleActiveResultSets=true"
dotnet restore
dotnet build
# create initial migrations (requires dotnet-ef)
dotnet tool install --global dotnet-ef
dotnet ef migrations add InitialCreate
dotnet ef database update
dotnet run
```

Docker:

```
docker build -t fjs-api ./server
docker run -e DEFAULT_CONNECTION="<your-connection-string>" -p 5000:80 fjs-api
```

Production notes:
- For Azure, use managed identity and the provided connection string pattern for Active Directory Default authentication.
- Set the `DefaultConnection` environment variable in App Service or container settings.
- Ensure the App Service has a managed identity with access to the SQL server if you use AD auth.

## Email + Frontend URL Configuration

The API sends password reset emails and needs SMTP + a frontend base URL to build the reset link.

Local development (preferred: JSON-based config):

Create or edit `appsettings.Development.json` and set:

```json
{
		"Smtp": {
		"Host": "localhost",
		"Port": 1025,
		"User": "",
		"Password": "",
			"From": "dev@example.com",
			"Delivery": "Console"
	},
	"FrontendBaseUrl": "http://localhost:3000"
}
```

You can point `Host`/`Port` at a local SMTP relay (e.g., MailHog at port 1025 or Papercut). If you don't want to run a local SMTP server, set `Smtp:Delivery` to `Console` (as above) to log emails instead of sending.

Optional local SMTP options:

- MailHog (Docker):
	- `docker run -d -p 8025:8025 -p 1025:1025 mailhog/mailhog`
	- Set `Smtp:Host=localhost`, `Smtp:Port=1025`; UI at http://localhost:8025
- smtp4dev (Docker):
	- `docker run -d -p 3001:80 -p 2525:25 rnwood/smtp4dev`
	- Set `Smtp:Host=localhost`, `Smtp:Port=25` (or 2525 if mapped); UI at http://localhost:3001

### Azure Communication Services (ACS) Email (Production-friendly)

Use ACS Email to send password reset emails securely with Azure-managed identity or connection string.

Config options (appsettings or environment):

```json
{
	"Email": { "Provider": "Acs" },
	"Acs": {
		"ConnectionString": "<acs-email-connection-string>",
		"From": "no-reply@your-verified-domain.com"
	},
	"FrontendBaseUrl": "https://your-frontend.example.com"
}
```

Alternatively (Managed Identity):

```json
{
	"Email": { "Provider": "Acs" },
	"Acs": {
		"Endpoint": "https://<your-acs-resource>.communication.azure.com/",
		"From": "no-reply@your-verified-domain.com"
	}
}
```

Environment variable equivalents:

- ACS_EMAIL_CONNECTION_STRING
- ACS_EMAIL_ENDPOINT (if using Managed Identity)
- SMTP_FROM (will be used as a fallback sender if Acs:From is not provided)
- FRONTEND_BASE_URL

Notes:
- The sender (Acs:From) must be a verified domain or email address in your ACS resource.
- In local dev, keep `Email:Provider=Console` to log emails; switch to `Acs` in production.

### Email health check endpoint

Use this to validate email configuration in a safe way (requires a shared key header).

1) Configure a secret:

```json
{
	"Email": {
		"HealthKey": "<long-random-secret>",
		"HealthRecipient": "ops@example.com" // optional; can also pass 'to' in request body
	}
}
```

Environment variable equivalent: `EMAIL_HEALTH_KEY`.

Security model:
- In Production, the endpoint requires the `X-Debug-Key` header to match `Email:HealthKey`/`EMAIL_HEALTH_KEY`.
- In non-production environments (Development/Staging), the endpoint can be called without setting any environment variables or keys, to simplify testing.

2) Call the endpoint:

POST /api/debug/email-health
- Header: `X-Debug-Key: <your-secret>`
- JSON body (optional): `{ "to": "someone@example.com" }`

Response: `{ ok: true, provider: "Acs|Smtp|Console", to: "..." }` or `{ ok: false, error: "..." }`.

Security: Don’t leave `Email:HealthKey` empty in production. Rotate the key as needed.

Alternative: environment variables (useful for containers/CI):

```powershell
$env:SMTP_HOST = "smtp.example.com"
$env:SMTP_PORT = "587"
$env:SMTP_USER = "user@example.com"
$env:SMTP_PASS = "<password>"
$env:SMTP_FROM = "noreply@example.com"
$env:FRONTEND_BASE_URL = "http://localhost:3000"
```

The app will read JSON first (Smtp:* and FrontendBaseUrl), then fall back to environment variables.
