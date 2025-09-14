using System;
using System.Net.Http;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Net.Http.Headers;

namespace FutureOfTheJobSearch.Server.Controllers
{
    public class ResumeParseRequest {
        public string? Filename { get; set; }
        public string? Content { get; set; }
    }
    public class SummarizeRequest {
        public string? Text { get; set; }
        public int MaxLength { get; set; } = 100;
    }

    [ApiController]
    public class ResumeParserController : ControllerBase
    {
        [HttpPost]
        [Route("/api/parse-resume")]
        public async Task<IActionResult> ParseResume([FromBody] ResumeParseRequest req)
        {
            var apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
            if (string.IsNullOrEmpty(apiKey))
            {
                return StatusCode(500, new { message = "OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable." });
            }

            if (req == null || string.IsNullOrEmpty(req.Content))
                return BadRequest(new { message = "No resume content supplied." });

            var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

            // Build prompt to extract JSON fields. Keep temperature low for deterministic output.
            var userPrompt = new StringBuilder();
            userPrompt.AppendLine($"Filename: {req.Filename}");
            userPrompt.AppendLine("\nResume content:\n");
            userPrompt.AppendLine(req.Content);
            userPrompt.AppendLine("\n\nInstruction: Extract the following fields from the resume when present and return ONLY valid JSON with these keys: FirstName, LastName, Email, PhoneNumber, Experience (array), Education (array), VisaStatus, Skills (array), Certifications (array), Interests (array), Languages (array), PreferredSalary. For Experience, return an array of objects with keys: Title (string), StartDate (yyyy-mm-dd if possible or human-readable), EndDate (yyyy-mm-dd or human-readable), Description (string). For Education, return an array of objects with keys: Level (string, one of: High School, Associate's, Bachelor's, Master's, Doctorate, None if present), School (string), StartDate (yyyy-mm or yyyy-mm-dd if available), EndDate (yyyy-mm or yyyy-mm-dd if available). Return the full Description text for each position (do not truncate or summarize). If a Title is not explicitly present, synthesize a concise Title from the position text (e.g. 'Software Engineer', 'Product Manager'). Use null for missing scalar fields and empty arrays for lists. Return strict JSON only and do not include any commentary or explanation.");
            userPrompt.AppendLine("\nExample output JSON:\n{\n  \"FirstName\": \"John\",\n  \"LastName\": \"Doe\",\n  \"Email\": \"john@example.com\",\n  \"PhoneNumber\": \"(555) 555-5555\",\n  \"Experience\": [\n    { \"Title\": \"Software Engineer\", \"StartDate\": \"2019-01-01\", \"EndDate\": \"2021-06-30\", \"Description\": \"Worked on X and Y...\" }\n  ],\n  \"Education\": [\n    { \"Level\": \"Bachelor's\", \"School\": \"State University\", \"StartDate\": \"2015-09\", \"EndDate\": \"2019-06\" }\n  ],\n  \"VisaStatus\": null,\n  \"Skills\": [\"C#\",\"JavaScript\"],\n  \"Certifications\": [],\n  \"Interests\": [],\n  \"Languages\": [\"English\"]\n}\n\nReturn only JSON. Do not include any surrounding text or commentary.");

            var payload = new
            {
                model = "gpt-3.5-turbo-16k",
                messages = new object[] {
                    new { role = "system", content = "You are a resume parsing assistant that returns strict JSON only." },
                    new { role = "user", content = userPrompt.ToString() }
                },
                temperature = 0.0
            };

            var json = JsonSerializer.Serialize(payload);
            var resp = await client.PostAsync("https://api.openai.com/v1/chat/completions", new StringContent(json, Encoding.UTF8, "application/json"));
            var txt = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode)
            {
                return StatusCode((int)resp.StatusCode, new { message = "OpenAI request failed", details = txt });
            }

            try
            {
                using var doc = JsonDocument.Parse(txt);
                var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
                if (string.IsNullOrWhiteSpace(content)) return Ok(new { raw = "" });

                // Try to extract the first JSON object from the returned content
                var start = content.IndexOf('{');
                var end = content.LastIndexOf('}');
                if (start >= 0 && end > start)
                {
                    var jsonPart = content.Substring(start, end - start + 1);
                    // Parse and return as JSON element
                    var parsed = JsonSerializer.Deserialize<JsonElement>(jsonPart);
                    return Ok(parsed);
                }

                // If parsing failed, return raw text for debugging
                return Ok(new { raw = content });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to parse OpenAI response.", details = ex.Message, raw = txt });
            }
        }

        [HttpPost]
        [Route("/api/summarize")]
        public async Task<IActionResult> SummarizeText([FromBody] SummarizeRequest req)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.Text)) return BadRequest(new { message = "No text provided" });

            var apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
            if (string.IsNullOrEmpty(apiKey))
            {
                return StatusCode(500, new { message = "OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable." });
            }

            var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

            var prompt = $"Summarize the following text into a concise description of no more than {req.MaxLength} characters, preserving meaning and readability. Return only the summary text.\n\nText:\n{req.Text}";

            var payload = new
            {
                model = "gpt-3.5-turbo-16k",
                messages = new object[] {
                    new { role = "system", content = "You are a helpful summarization assistant." },
                    new { role = "user", content = prompt }
                },
                temperature = 0.0
            };

            var json = JsonSerializer.Serialize(payload);
            var resp = await client.PostAsync("https://api.openai.com/v1/chat/completions", new StringContent(json, Encoding.UTF8, "application/json"));
            var txt = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode)
            {
                return StatusCode((int)resp.StatusCode, new { message = "OpenAI request failed", details = txt });
            }

            try
            {
                using var doc = JsonDocument.Parse(txt);
                var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
                return Ok(new { summary = content?.Trim() });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to parse OpenAI response.", details = ex.Message, raw = txt });
            }
        }

        [HttpPost]
        [Route("/api/parse-resume-file")]
        public async Task<IActionResult> ParseResumeFile([FromForm] Microsoft.AspNetCore.Http.IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { message = "No file provided" });

            var ext = Path.GetExtension(file.FileName ?? "").ToLowerInvariant();
            string? content = null;

            if (ext == ".txt")
            {
                using var sr = new StreamReader(file.OpenReadStream(), Encoding.UTF8);
                content = await sr.ReadToEndAsync();
            }
            else if (ext == ".docx")
            {
                try
                {
                    using var ms = new MemoryStream();
                    await file.CopyToAsync(ms);
                    ms.Position = 0;
                    using var archive = new System.IO.Compression.ZipArchive(ms, System.IO.Compression.ZipArchiveMode.Read, false);
                    var entry = archive.GetEntry("word/document.xml");
                    if (entry != null)
                    {
                        using var s = entry.Open(); using var sr = new StreamReader(s, Encoding.UTF8);
                        var xml = await sr.ReadToEndAsync();
                        // strip xml tags to get plain text
                        content = System.Text.RegularExpressions.Regex.Replace(xml, "<[^>]+>", " ");
                    }
                }
                catch (Exception ex)
                {
                    return StatusCode(500, new { message = "Failed to extract .docx content", detail = ex.Message });
                }
            }
            else if (ext == ".pdf")
            {
                return StatusCode(501, new { message = "PDF parsing not supported on this server. Please upload a .txt or .docx file, or paste resume text." });
            }
            else
            {
                return BadRequest(new { message = "Unsupported file type. Supported: .txt, .docx, .pdf" });
            }

            if (string.IsNullOrWhiteSpace(content)) return BadRequest(new { message = "Could not extract text from file." });

            // reuse the same OpenAI call logic as ParseResume
            var apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
            if (string.IsNullOrEmpty(apiKey))
            {
                return StatusCode(500, new { message = "OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable." });
            }

            var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

            var userPrompt = new StringBuilder();
            userPrompt.AppendLine($"Filename: {file.FileName}");
            userPrompt.AppendLine("\nResume content:\n");
            userPrompt.AppendLine(content);
            userPrompt.AppendLine("\n\nInstruction: Extract the following fields from the resume when present and return ONLY valid JSON with these keys: FirstName, LastName, Email, PhoneNumber, Experience (array), Education (array), VisaStatus, Skills (array), Certifications (array), Interests (array), Languages (array), PreferredSalary. For Experience, return an array of objects with keys: Title (string), StartDate (yyyy-mm-dd if possible or human-readable), EndDate (yyyy-mm-dd or human-readable), Description (string). For Education, return an array of objects with keys: Level (string, one of: High School, Associate's, Bachelor's, Master's, Doctorate, None if present), School (string), StartDate (yyyy-mm or yyyy-mm-dd if available), EndDate (yyyy-mm or yyyy-mm-dd if available). Return the full Description text for each position (do not truncate or summarize). Use null for missing scalar fields and empty arrays for lists. Return strict JSON only and do not include any commentary or explanation.");

            var payload = new
            {
                model = "gpt-3.5-turbo-16k",
                messages = new object[] {
                    new { role = "system", content = "You are a resume parsing assistant that returns strict JSON only." },
                    new { role = "user", content = userPrompt.ToString() }
                },
                temperature = 0.0
            };

            var json = JsonSerializer.Serialize(payload);
            var resp = await client.PostAsync("https://api.openai.com/v1/chat/completions", new StringContent(json, Encoding.UTF8, "application/json"));
            var txt = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode)
            {
                return StatusCode((int)resp.StatusCode, new { message = "OpenAI request failed", details = txt });
            }

            try
            {
                using var doc = JsonDocument.Parse(txt);
                var contentResp = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
                if (string.IsNullOrWhiteSpace(contentResp)) return Ok(new { raw = "" });
                var start = contentResp.IndexOf('{');
                var end = contentResp.LastIndexOf('}');
                if (start >= 0 && end > start)
                {
                    var jsonPart = contentResp.Substring(start, end - start + 1);
                    var parsed = JsonSerializer.Deserialize<JsonElement>(jsonPart);
                    return Ok(parsed);
                }
                return Ok(new { raw = contentResp });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to parse OpenAI response.", details = ex.Message, raw = txt });
            }
        }
    }
}
