namespace FutureOfTheJobSearch.Server.DTOs
{
    public class RegisterRequest
    {
        public string CompanyName { get; set; } = string.Empty;
        public string ContactName { get; set; } = string.Empty;
        public string ContactEmail { get; set; } = string.Empty;
        public string? Website { get; set; }
    public string? CompanyDescription { get; set; }
    public string? CompanySize { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Address { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
