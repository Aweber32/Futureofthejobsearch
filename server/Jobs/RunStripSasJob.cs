using System;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using FutureOfTheJobSearch.Server.Data;

namespace FutureOfTheJobSearch.Server.Jobs
{
    public class RunStripSasJob
    {
        public static async Task<int> Run(IServiceProvider services)
        {
            using var scope = services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var job = new StripSasFromBlobUrlsJob(db);
            return await job.RunAsync();
        }
    }
}
