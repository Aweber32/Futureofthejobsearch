# Server — FutureOfTheJobSearch API

This folder contains an ASP.NET Core Web API using Identity + EF Core and SQL Server.  

Quick start (local):

- Ensure .NET 7 SDK is installed.
- From `server/` set a connection string in environment or `appsettings.json`.

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
