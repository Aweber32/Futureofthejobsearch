# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["FutureOfTheJobSearch.Server.csproj", "./"]
RUN dotnet restore "./FutureOfTheJobSearch.Server.csproj"
COPY . .
RUN dotnet publish "FutureOfTheJobSearch.Server.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:80
COPY --from=build /app/publish .
EXPOSE 80
ENTRYPOINT ["dotnet", "FutureOfTheJobSearch.Server.dll"]
