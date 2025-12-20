using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace FutureOfTheJobSearch.Server.Services
{
    public interface IGeocodingService
    {
        Task<(double? latitude, double? longitude)> GetCoordinatesAsync(string? city, string? state);
    }

    public class GeocodingService : IGeocodingService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<GeocodingService> _logger;
        private static readonly Dictionary<string, (double lat, double lon)> _cache = new();

        public GeocodingService(HttpClient httpClient, ILogger<GeocodingService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "FutureOfTheJobSearch/1.0");
        }

        public async Task<(double? latitude, double? longitude)> GetCoordinatesAsync(string? city, string? state)
        {
            // Return null if no location provided
            if (string.IsNullOrWhiteSpace(city) || string.IsNullOrWhiteSpace(state))
            {
                return (null, null);
            }

            var cacheKey = $"{city},{state}".ToLower();
            
            // Check cache first
            if (_cache.TryGetValue(cacheKey, out var cached))
            {
                return (cached.lat, cached.lon);
            }

            try
            {
                // Use Nominatim (OpenStreetMap) geocoding - free, no API key needed
                var query = $"{city}, {state}, USA";
                var url = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(query)}&format=json&limit=1";

                var response = await _httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();

                var json = await response.Content.ReadAsStringAsync();
                var results = JsonSerializer.Deserialize<List<NominatimResult>>(json);

                if (results != null && results.Count > 0)
                {
                    var result = results[0];
                    var lat = double.Parse(result.lat);
                    var lon = double.Parse(result.lon);
                    
                    // Cache the result
                    _cache[cacheKey] = (lat, lon);
                    
                    _logger.LogInformation($"Geocoded {city}, {state} to ({lat}, {lon})");
                    return (lat, lon);
                }

                _logger.LogWarning($"No geocoding results found for {city}, {state}");
                return (null, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Geocoding failed for {city}, {state}");
                return (null, null);
            }
        }

        private class NominatimResult
        {
            public string lat { get; set; } = "";
            public string lon { get; set; } = "";
        }
    }
}
