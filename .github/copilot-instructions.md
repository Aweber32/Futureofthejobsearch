# FutureOfTheJobSearch - AI Agent Instructions

## Architecture Overview

This is a dual-stack job marketplace application with a **Next.js frontend** and **ASP.NET Core API backend**:

- **Frontend**: Next.js app in root directory using Bootstrap + Tailwind CSS hybrid styling
- **Backend**: ASP.NET Core 9.0 API in `server/` with Entity Framework Core + SQL Server
- **Authentication**: ASP.NET Identity with JWT tokens, employer/seeker role separation via claims
- **Storage**: Azure Blob Storage for file uploads (resumes, company logos, videos)

## Key Architectural Patterns

### User Role Architecture
The app supports two distinct user types with separate workflows:
- **Employers** (`pages/poster/`) - create positions, view candidates
- **Seekers** (`pages/seeker/`) - browse positions, manage profiles
- Role determination happens via Identity claims (`employerId` or `seekerId`)

### Entity Relationships
```
ApplicationUser -> Employer/Seeker (1:1 via UserId)
Employer -> Positions (1:many)
Position -> PositionSkill/Experience/Education (1:many normalized collections)
SeekerInterest/PositionInterest (many-to-many interest tracking)
```

### API Controller Patterns
Controllers in `server/Controllers/` follow consistent patterns:
- `[Authorize]` attribute for protected endpoints
- Claims-based role checking: `User.Claims.FirstOrDefault(c => c.Type == "employerId")`
- EF Core with `.Include()` for navigation properties
- DTO pattern for request/response models in `server/DTOs/`

## Development Workflows

### Frontend Development
```powershell
npm install
npm run dev  # Runs on port 3000
```

### Backend Development
```powershell
cd server
$env:DEFAULT_CONNECTION = "Server=(localdb)\\mssqllocaldb;Database=FJS_dev;Trusted_Connection=True;MultipleActiveResultSets=true"
dotnet restore
dotnet build
dotnet ef database update  # Apply migrations
dotnet run  # API runs on port 5000
```

### Database Migrations
Always use EF Core migrations for schema changes:
```powershell
cd server
dotnet ef migrations add MigrationName
dotnet ef database update
```

## Project-Specific Conventions

### Component Structure
- **Layout.js**: Universal layout wrapper with `AnnouncementBanner` + `Footer`
- **Card Components**: `JobPostCard`, `SeekerCard`, `CompanyCard` follow Bootstrap card patterns
- **Modal Components**: Use Bootstrap modals (e.g., `PositionReviewModal`)
- **Swiper Components**: Horizontal scrolling lists for positions/candidates

### Styling Approach
Hybrid Bootstrap + Tailwind CSS approach:
- Bootstrap for components (`'bootstrap/dist/css/bootstrap.min.css'` in `_app.js`)
- Tailwind for utilities (configured in `postcss.config.js`)
- Custom styles in `styles/globals.css` and `styles/tokens.css`

### API Response Patterns
- Circular reference handling: `ReferenceHandler.IgnoreCycles` in `Program.cs`
- Consistent error responses: `return Unauthorized(new { error = "message" })`
- Navigation property loading: Always use `.Include()` when returning related data

### File Upload Integration
Azure Blob Storage containers configured in `appsettings.json`:
- `BlobContainer`: Company logos
- `ResumeContainer`: Seeker resumes  
- `SeekerVideoContainer`: Seeker profile videos
- `PosterVideoContainer`: Employer position videos

## Critical Configuration

### Connection Strings
Backend requires `DEFAULT_CONNECTION` environment variable or `appsettings.json`:
```json
"ConnectionStrings": {
  "DefaultConnection": "Azure SQL connection string with Active Directory Default auth"
}
```

### Identity Configuration
Configured in `Program.cs` with:
- Password requirements: 8+ chars, require digit, no special chars required
- Cookie authentication for web clients
- JWT bearer tokens for API access

## Common Development Tasks

### Adding New Entities
1. Create model in `server/Models/`
2. Add DbSet to `ApplicationDbContext.cs`
3. Configure relationships in `OnModelCreating()`
4. Create migration: `dotnet ef migrations add AddEntityName`
5. Update database: `dotnet ef database update`

### Adding API Endpoints
1. Create DTO in `server/DTOs/` if needed
2. Add controller method with proper `[Authorize]` and claims validation
3. Use consistent error handling patterns
4. Include navigation properties with `.Include()` when returning related data

### Adding Frontend Pages
1. Create page in appropriate folder (`pages/poster/` or `pages/seeker/`)
2. Wrap with `Layout` component for consistent structure
3. Use existing component patterns (`*Card`, `*Modal`, `*Swiper`)
4. Follow Bootstrap + Tailwind hybrid styling approach

This codebase emphasizes clear separation between employer and seeker workflows, consistent API patterns with proper authorization, and a component-based frontend architecture.