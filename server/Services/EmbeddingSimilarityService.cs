using System;
using System.Collections.Generic;
using System.Linq;

namespace FutureOfTheJobSearch.Server.Services
{
    /// <summary>
    /// Service for calculating similarity between embeddings using cosine similarity.
    /// Embeddings are stored as byte[] (numpy float32 arrays serialized).
    /// </summary>
    public interface IEmbeddingSimilarityService
    {
        /// <summary>
        /// Calculate cosine similarity between two embeddings (both as byte[] arrays).
        /// Returns score in range [0, 1] where 1 = identical, 0 = orthogonal.
        /// </summary>
        double CalculateSimilarity(byte[]? embedding1, byte[]? embedding2);
    }

    public class EmbeddingSimilarityService : IEmbeddingSimilarityService
    {
        public double CalculateSimilarity(byte[]? embedding1, byte[]? embedding2)
        {
            // Handle null/empty cases
            if (embedding1 == null || embedding1.Length == 0 || 
                embedding2 == null || embedding2.Length == 0)
                return 0.0;

            // Convert byte arrays to float arrays
            var vec1 = BytesToFloats(embedding1);
            var vec2 = BytesToFloats(embedding2);

            if (vec1 == null || vec2 == null || vec1.Length != vec2.Length)
                return 0.0;

            // Calculate cosine similarity: (A · B) / (||A|| * ||B||)
            double dotProduct = 0.0;
            double normA = 0.0;
            double normB = 0.0;

            for (int i = 0; i < vec1.Length; i++)
            {
                dotProduct += vec1[i] * vec2[i];
                normA += vec1[i] * vec1[i];
                normB += vec2[i] * vec2[i];
            }

            normA = Math.Sqrt(normA);
            normB = Math.Sqrt(normB);

            // Avoid division by zero
            if (normA < 1e-10 || normB < 1e-10)
                return 0.0;

            double similarity = dotProduct / (normA * normB);

            // Clamp to [0, 1] to handle floating point errors
            return Math.Max(0.0, Math.Min(1.0, similarity));
        }

        /// <summary>
        /// Convert byte array (numpy float32 serialized) to float array.
        /// Assumes little-endian byte order.
        /// </summary>
        private static float[]? BytesToFloats(byte[] bytes)
        {
            if (bytes == null || bytes.Length % 4 != 0)
                return null;

            int count = bytes.Length / 4;
            float[] result = new float[count];

            for (int i = 0; i < count; i++)
            {
                int index = i * 4;
                result[i] = BitConverter.ToSingle(bytes, index);
            }

            return result;
        }
    }
}
