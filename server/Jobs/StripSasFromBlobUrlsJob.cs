using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using FutureOfTheJobSearch.Server.Data;
using FutureOfTheJobSearch.Server.Models;

namespace FutureOfTheJobSearch.Server.Jobs
{
    public class StripSasFromBlobUrlsJob
    {
        private readonly ApplicationDbContext _db;
        public StripSasFromBlobUrlsJob(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<int> RunAsync()
        {
            int updated = 0;

            // Helper to strip SAS from a blob URL, leaving only the path
            string StripSas(string url)
            {
                if (string.IsNullOrEmpty(url)) return url;
                var uri = new Uri(url, UriKind.RelativeOrAbsolute);
                // If absolute, get path and filename
                if (uri.IsAbsoluteUri)
                {
                    // e.g. https://account.blob.core.windows.net/container/blob.ext?[SAS]
                    var path = uri.AbsolutePath;
                    // Remove leading slash if present
                    if (path.StartsWith("/")) path = path.Substring(1);
                    return path;
                }
                // If already path-only, return as-is
                return url;
            }

            // Seekers: ResumeUrl, VideoUrl, HeadshotUrl
            var seekers = await _db.Seekers.ToListAsync();
            foreach (var s in seekers)
            {
                var origResume = s.ResumeUrl;
                var origVideo = s.VideoUrl;
                var origHeadshot = s.HeadshotUrl;
                s.ResumeUrl = StripSas(s.ResumeUrl);
                s.VideoUrl = StripSas(s.VideoUrl);
                s.HeadshotUrl = StripSas(s.HeadshotUrl);
                if (s.ResumeUrl != origResume || s.VideoUrl != origVideo || s.HeadshotUrl != origHeadshot) updated++;
            }

            // Employers: LogoUrl
            var employers = await _db.Employers.ToListAsync();
            foreach (var e in employers)
            {
                var origLogo = e.LogoUrl;
                e.LogoUrl = StripSas(e.LogoUrl);
                if (e.LogoUrl != origLogo) updated++;
            }

            // Positions: PosterVideoUrl
            var positions = await _db.Positions.ToListAsync();
            foreach (var p in positions)
            {
                var origPosterVideo = p.PosterVideoUrl;
                p.PosterVideoUrl = StripSas(p.PosterVideoUrl);
                if (p.PosterVideoUrl != origPosterVideo) updated++;
            }

            await _db.SaveChangesAsync();
            return updated;
        }
    }
}
