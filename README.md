# Proslipsi - Next-Generation Job Marketplace

Proslipsi is a modern dual-stack job marketplace application that connects employers with qualified candidates through intelligent matching and streamlined workflows.

## 🚀 Live Application

- **Frontend**: https://futureofthejobsearch-d3d3fad4c2h4g4hc.centralus-01.azurewebsites.net
- **API**: https://futureofthejobsearch-api-brd3cjc3f2debhek.centralus-01.azurewebsites.net

## 🏗️ Architecture

- **Frontend**: Next.js 13+ with React 18, Bootstrap + Tailwind CSS
- **Backend**: ASP.NET Core 9.0 API with Entity Framework Core
- **Database**: Azure SQL Database with managed identity
- **Storage**: Azure Blob Storage for file uploads
- **Authentication**: ASP.NET Identity with JWT tokens
- **Deployment**: Azure App Services with GitHub Actions CI/CD

## 🛠️ Local Development

### Prerequisites
- Node.js 18+ and npm
- .NET 8 SDK
- SQL Server LocalDB

### Quick Start (PowerShell)

```powershell
# 1) Clone and install dependencies
git clone <repo-url>
cd FutureOfTheJobSearch
npm install

# 2) Configure environment
cp .env.local.template .env.local

# 3) Setup backend database
cd server
$env:DEFAULT_CONNECTION = "Server=(localdb)\\mssqllocaldb;Database=FJS_dev;Trusted_Connection=True;MultipleActiveResultSets=true"
dotnet restore
dotnet ef database update

# 4) Start services (separate terminals)
# Terminal 1 - Frontend
npm run dev  # http://localhost:3000

# Terminal 2 - Backend  
cd server
dotnet run   # http://localhost:5000
```

## 📁 Project Structure

```
├── pages/              # Next.js routes
│   ├── poster/         # Employer workflows
│   └── seeker/         # Job seeker workflows
├── components/         # Shared React components
├── server/             # ASP.NET Core API
│   ├── Controllers/    # API endpoints
│   ├── Models/         # Entity models
│   └── Data/           # Entity Framework context
├── styles/             # Global styles and tokens
└── .github/            # CI/CD workflows
```

## 🔐 User Roles

- **Employers** (`/poster/*`) - Create positions, view candidates, manage company profiles
- **Seekers** (`/seeker/*`) - Browse positions, manage profiles, upload resumes/videos

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive Azure deployment instructions including:
- Service Principal setup
- GitHub Actions configuration
- Environment variables
- Azure resource requirements

## 🛡️ Security

- Claims-based authentication with JWT tokens
- Role-based access control (Employer/Seeker)
- Azure managed identity for database connections
- CORS properly configured for production domains
