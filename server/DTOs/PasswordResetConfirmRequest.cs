namespace FutureOfTheJobSearch.Server.DTOs
{
    public class PasswordResetConfirmRequest
    {
        public string? UserId { get; set; }
        public string? Token { get; set; }
        public string? NewPassword { get; set; }
    }
}
