using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using Azure.Communication.Email;
using Azure;
using Azure.Identity;

namespace FutureOfTheJobSearch.Server.Services
{
    public interface IEmailService
    {
        Task SendAsync(string to, string subject, string htmlBody);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;
        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendAsync(string to, string subject, string htmlBody)
        {
            // Provider: Email:Provider = Acs | Smtp | Console (default Smtp)
            var provider = (_config["Email:Provider"] ?? "Smtp").Trim().ToLowerInvariant();

            // Console/log mode for local development
            var delivery = (_config["Smtp:Delivery"] ?? (provider == "console" ? "Console" : "Smtp")).Trim().ToLowerInvariant();
            if (delivery == "console" || delivery == "log")
            {
                _logger.LogInformation("[EmailService:Console] To: {To}\nSubject: {Subject}\nBody:\n{Body}", to, subject, htmlBody);
                return; // no-op send for local development
            }

            if (provider == "acs")
            {
                // Azure Communication Services Email
                var acsFrom = _config["Acs:From"] ?? _config["Smtp:From"] ?? System.Environment.GetEnvironmentVariable("SMTP_FROM");
                var connectionString = _config["Acs:ConnectionString"] ?? System.Environment.GetEnvironmentVariable("ACS_EMAIL_CONNECTION_STRING");
                var endpoint = _config["Acs:Endpoint"] ?? System.Environment.GetEnvironmentVariable("ACS_EMAIL_ENDPOINT");
                if (string.IsNullOrWhiteSpace(acsFrom))
                {
                    throw new System.InvalidOperationException("ACS sender address missing. Set Acs:From (or SMTP_FROM).");
                }

                EmailClient acsClient;
                if (!string.IsNullOrWhiteSpace(connectionString))
                {
                    acsClient = new EmailClient(connectionString);
                }
                else if (!string.IsNullOrWhiteSpace(endpoint))
                {
                    // Use Managed Identity or other DefaultAzureCredential supported auth in Azure
                    acsClient = new EmailClient(new Uri(endpoint), new DefaultAzureCredential());
                }
                else
                {
                    throw new System.InvalidOperationException("ACS configuration missing. Provide Acs:ConnectionString or Acs:Endpoint.");
                }

                var content = new EmailContent(subject)
                {
                    Html = htmlBody
                };
                var message = new EmailMessage(acsFrom, to, content);

                try
                {
                    // Wait for completion to surface errors immediately
                    var result = await acsClient.SendAsync(WaitUntil.Completed, message);
                    if (result?.HasCompleted != true)
                    {
                        _logger.LogWarning("[EmailService:ACS] Send did not report completion. Status: {Status}", result?.Value?.Status.ToString());
                    }
                }
                catch (RequestFailedException ex)
                {
                    _logger.LogError(ex, "[EmailService:ACS] Failed to send email");
                    throw;
                }

                return;
            }

            // Read SMTP config from appsettings or environment variables
            var host = _config["Smtp:Host"] ?? System.Environment.GetEnvironmentVariable("SMTP_HOST");
            var portStr = _config["Smtp:Port"] ?? System.Environment.GetEnvironmentVariable("SMTP_PORT") ?? "587";
            var user = _config["Smtp:User"] ?? System.Environment.GetEnvironmentVariable("SMTP_USER");
            var pass = _config["Smtp:Password"] ?? System.Environment.GetEnvironmentVariable("SMTP_PASS");
            var smtpFrom = _config["Smtp:From"] ?? System.Environment.GetEnvironmentVariable("SMTP_FROM") ?? user;

            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(smtpFrom))
            {
                throw new System.InvalidOperationException("SMTP configuration missing. Set Smtp:* (Host/From) in appsettings or SMTP_* environment variables, or set Smtp:Delivery=Console for local development.");
            }

            int port = 587;
            int.TryParse(portStr, out port);

            using var smtpClient = new SmtpClient(host, port)
            {
                EnableSsl = true,
                Credentials = !string.IsNullOrEmpty(user)
                    ? new NetworkCredential(user, pass)
                    : CredentialCache.DefaultNetworkCredentials
            };

            var msg = new MailMessage()
            {
                From = new MailAddress(smtpFrom!),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            msg.To.Add(to);

            await smtpClient.SendMailAsync(msg);
        }
    }
}
