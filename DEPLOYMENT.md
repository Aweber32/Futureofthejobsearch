# ELEV8R Azure Deployment Guide

This guide provides step-by-step instructions for deploying the ELEV8R application to Azure.

## Architecture Overview

- **Frontend**: Next.js app deployed to Azure App Service (Node.js)
- **Backend**: ASP.NET Core API deployed to Azure App Service (.NET 8)
- **Database**: Azure SQL Database with managed identity authentication
- **Storage**: Azure Blob Storage for file uploads
- **CI/CD**: GitHub Actions with Service Principal authentication

## Production URLs

- **Frontend**: https://futureofthejobsearch-d3d3fad4c2h4g4hc.centralus-01.azurewebsites.net
- **Backend API**: https://futureofthejobsearch-api-brd3cjc3f2debhek.centralus-01.azurewebsites.net

## Prerequisites

1. Azure subscription with appropriate permissions
2. GitHub repository with secrets configured
3. Azure CLI installed locally (for manual operations)

## GitHub Secrets Configuration

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### Service Principal Authentication
```json
AZURE_CREDENTIALS: {
  "clientId": "your-service-principal-client-id",
  "clientSecret": "your-service-principal-client-secret",
  "subscriptionId": "your-subscription-id",
  "tenantId": "your-tenant-id"
}
```

### Resource Configuration
```bash
AZURE_RG=your-resource-group-name
AZURE_SQL_CONNECTION_STRING=your-azure-sql-connection-string
```

## Service Principal Setup

Create a Service Principal with Contributor access to your resource group:

```powershell
# Create service principal
$sp = az ad sp create-for-rbac --name "ELEV8R-Deploy" --role contributor --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/YOUR_RESOURCE_GROUP" --sdk-auth | ConvertFrom-Json

# Output the JSON for GitHub Secrets
$sp | ConvertTo-Json -Compress
```

## Azure Resources Required

### App Services
1. **Frontend App Service**
   - Name: `futureofthejobsearch-d3d3fad4c2h4g4hc`
   - Runtime: Node.js 20 LTS
   - Environment Variables:
     - `NEXT_PUBLIC_API_URL`: `https://futureofthejobsearch-api-brd3cjc3f2debhek.centralus-01.azurewebsites.net`
     - `NEXT_PUBLIC_API_BASE`: `https://futureofthejobsearch-api-brd3cjc3f2debhek.centralus-01.azurewebsites.net`
     - `NODE_ENV`: `production`

2. **Backend App Service**
   - Name: `futureofthejobsearch-api-brd3cjc3f2debhek`
   - Runtime: .NET 8
   - Environment Variables:
     - `ASPNETCORE_ENVIRONMENT`: `Production`
     - `DEFAULT_CONNECTION`: Your Azure SQL connection string
   - CORS Settings: Frontend domain allowed

### Azure SQL Database
- Connection string format: `Server=tcp:YOUR_SERVER.database.windows.net,1433;Database=YOUR_DB;Authentication=Active Directory Default;`

### Azure Blob Storage
- Container for file uploads (resumes, logos, videos)
- Connection string configured in app settings

## Deployment Process

### Automatic Deployment
1. Push to `main` branch triggers full deployment
2. Changes to frontend files (`pages/`, `components/`, `styles/`) deploy frontend only
3. Changes to backend files (`server/`) deploy backend only

### Manual Deployment
```bash
# Login to Azure
az login

# Deploy frontend
cd /path/to/repo
npm run build
az webapp deployment source config-zip --name futureofthejobsearch-d3d3fad4c2h4g4hc --resource-group YOUR_RG --src build.zip

# Deploy backend
cd server
dotnet publish -o publish
Compress-Archive -Path publish/* -DestinationPath api.zip
az webapp deployment source config-zip --name futureofthejobsearch-api-brd3cjc3f2debhek --resource-group YOUR_RG --src api.zip
```

## Local Development Setup

1. **Environment Variables**
   ```bash
   # Copy template and configure for local development
   cp .env.local.template .env.local
   ```

2. **Database Connection**
   ```bash
   # Set in PowerShell
   $env:DEFAULT_CONNECTION = "Server=(localdb)\\mssqllocaldb;Database=FJS_dev;Trusted_Connection=True;MultipleActiveResultSets=true"
   ```

3. **Start Services**
   ```bash
   # Terminal 1 - Frontend
   npm install
   npm run dev  # Runs on http://localhost:3000

   # Terminal 2 - Backend
   cd server
   dotnet restore
   dotnet ef database update
   dotnet run  # Runs on http://localhost:5000
   ```

## Configuration Details

### CORS Configuration
The backend is configured to accept requests from:
- `http://localhost:3000` (local development)
- `https://futureofthejobsearch-d3d3fad4c2h4g4hc.centralus-01.azurewebsites.net` (production)

### API Base URL Configuration
- **Local**: `http://localhost:5000`
- **Production**: `https://futureofthejobsearch-api-brd3cjc3f2debhek.centralus-01.azurewebsites.net`

The frontend automatically uses the correct API URL based on environment variables.

## Troubleshooting

### Common Issues
1. **CORS Errors**: Ensure frontend domain is added to backend CORS policy
2. **Authentication Errors**: Verify Service Principal has correct permissions
3. **Database Connection**: Check Azure SQL connection string and managed identity setup
4. **Environment Variables**: Ensure all required env vars are set in App Service configuration

### Monitoring
- Check Application Insights for runtime errors
- Monitor App Service logs for deployment issues
- Use Azure Resource Health for service availability

## Security Considerations

1. Service Principal follows principle of least privilege
2. All connections use HTTPS in production
3. Sensitive configuration stored in Azure Key Vault (recommended)
4. Regular rotation of secrets and certificates

## Cost Optimization

1. Use appropriate App Service tiers for your needs
2. Consider scaling rules for traffic fluctuations
3. Monitor and optimize database DTU usage
4. Regular review of storage costs

---

For support, refer to the GitHub repository issues or Azure documentation.