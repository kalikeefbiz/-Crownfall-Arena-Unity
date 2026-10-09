#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace Crownfall.EnvironmentLab.Editor
{
    [Serializable] public sealed class ProtectedFileChange
    {
        public string relativePath, classification, previousSha256, currentSha256, protectedRoot, phase, reason;
        public bool allowedGeneratedMetadata;
    }
    [Serializable] public sealed class ProtectionDiffReport
    {
        public string phase;
        public int previousFileCount, currentFileCount, totalChanges, rejectedCount, allowedMetadataCount, omittedChanges;
        public ProtectedFileChange[] changes;
    }
    public sealed class ProtectedFilesChangedException : InvalidOperationException
    {
        public readonly ProtectionDiffReport report;
        public ProtectedFilesChangedException(ProtectionDiffReport value) : base(Summary(value)) { report = value; }
        static string Summary(ProtectionDiffReport value)
        {
            var first = value.changes.FirstOrDefault(c => !c.allowedGeneratedMetadata);
            return "Protected files changed in phase '" + value.phase + "': " + value.rejectedCount +
                " rejected, " + value.allowedMetadataCount + " permitted new metadata. " +
                (first == null ? "" : first.classification + " " + first.relativePath + " [root=" + first.protectedRoot +
                ", previousSHA256=" + (first.previousSha256 ?? "MISSING") + ", currentSHA256=" +
                (first.currentSha256 ?? "MISSING") + "]. ") + "See protectedFileChecks in the native reports.";
        }
    }

    // Pure filesystem/identity policy. This exact code is linked into the license-free preflight.
    public sealed class ProtectedFileSnapshot
    {
        public const int MaximumReportedChanges = 64;
        readonly string projectRoot;
        readonly string[] roots;
        readonly HashSet<string> committed;
        readonly Dictionary<string, string> eligibleGuids = new Dictionary<string, string>(StringComparer.Ordinal);
        readonly HashSet<string> eligibleFolders = new HashSet<string>(StringComparer.Ordinal);
        Dictionary<string, string> files;
        HashSet<string> directories;
        ProtectedFileSnapshot(string project, string[] protectedRoots, string[] committedPaths)
        {
            projectRoot = Path.GetFullPath(project);
            roots = protectedRoots.Select(Normalize).Distinct(StringComparer.Ordinal).OrderBy(p => p, StringComparer.Ordinal).ToArray();
            committed = new HashSet<string>(committedPaths.Select(Normalize), StringComparer.Ordinal);
        }
        public static ProtectedFileSnapshot Capture(string project, string[] protectedRoots, string[] committedPaths,
            Func<string, string> registeredGuid)
        {
            if (protectedRoots == null || committedPaths == null || registeredGuid == null) throw new ArgumentNullException();
            var snapshot = new ProtectedFileSnapshot(project, protectedRoots, committedPaths);
            snapshot.Scan(out snapshot.files, out snapshot.directories);
            var missing = snapshot.committed.Where(p => snapshot.RootOf(p) != null && !snapshot.files.ContainsKey(p))
                .Select(p => snapshot.Change(p, "Removed", null, null, "snapshot baseline", "Committed protected file missing before generation", false)).ToArray();
            if (missing.Length != 0) throw new ProtectedFilesChangedException(snapshot.Report("snapshot baseline", snapshot.files.Count, missing));
            foreach (var asset in snapshot.files.Keys.Where(p => !p.EndsWith(".meta", StringComparison.Ordinal))
                .Concat(snapshot.directories).Distinct(StringComparer.Ordinal).OrderBy(p => p, StringComparer.Ordinal))
            {
                string metadata = asset + ".meta";
                // Existing metadata (tracked OR untracked) is always protected. Packages/settings are never eligible.
                if (!asset.StartsWith("Assets/", StringComparison.Ordinal) || snapshot.files.ContainsKey(metadata) ||
                    snapshot.committed.Contains(metadata) || snapshot.RootOf(metadata) == null) continue;
                string identity = registeredGuid(asset);
                if (identity == null || !Regex.IsMatch(identity, @"\A[0-9a-fA-F]{32}\z")) continue;
                snapshot.eligibleGuids[metadata] = identity.ToLowerInvariant();
                if (snapshot.directories.Contains(asset)) snapshot.eligibleFolders.Add(metadata);
            }
            return snapshot;
        }
        static string Normalize(string path)
        {
            if (string.IsNullOrEmpty(path)) throw new ArgumentException("Empty protected path");
            string value = path.Replace('\\', '/');
            if (value.StartsWith("/", StringComparison.Ordinal) || value.IndexOf(':') >= 0 ||
                value.Split('/').Any(p => p == ".." || p == "." || p.Length == 0) || value.Any(char.IsControl))
                throw new ArgumentException("Invalid project-relative protected path");
            return value;
        }
        string Absolute(string relative) { return Path.Combine(projectRoot, relative.Replace('/', Path.DirectorySeparatorChar)); }
        string Relative(string absolute) { return Normalize(Path.GetRelativePath(projectRoot, absolute)); }
        string RootOf(string path)
        { return roots.FirstOrDefault(r => path.StartsWith(r + "/", StringComparison.Ordinal) || path == r || path == r + ".meta"); }
        static string Hash(string path)
        {
            using (var stream = File.OpenRead(path))
            using (var hash = SHA256.Create())
                return BitConverter.ToString(hash.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();
        }
        static void RequireRegular(string path)
        {
            if ((File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0)
                throw new IOException("Protected snapshot cannot follow a symbolic link/reparse point");
        }
        void Scan(out Dictionary<string, string> foundFiles, out HashSet<string> foundDirectories)
        {
            foundFiles = new Dictionary<string, string>(StringComparer.Ordinal);
            foundDirectories = new HashSet<string>(StringComparer.Ordinal);
            foreach (string root in roots)
            {
                string absoluteRoot = Absolute(root);
                string ownMetadata = absoluteRoot + ".meta";
                if (File.Exists(ownMetadata)) { RequireRegular(ownMetadata); foundFiles[root + ".meta"] = Hash(ownMetadata); }
                if (!Directory.Exists(absoluteRoot)) continue;
                RequireRegular(absoluteRoot);
                var queue = new Queue<string>(); queue.Enqueue(absoluteRoot);
                while (queue.Count != 0)
                {
                    string directory = queue.Dequeue(); foundDirectories.Add(Relative(directory));
                    foreach (string childDirectory in Directory.GetDirectories(directory).OrderBy(p => p, StringComparer.Ordinal))
                    { RequireRegular(childDirectory); queue.Enqueue(childDirectory); }
                    foreach (string file in Directory.GetFiles(directory).OrderBy(p => p, StringComparer.Ordinal))
                    { RequireRegular(file); foundFiles[Relative(file)] = Hash(file); }
                }
            }
        }
        bool PermittedMetadata(string path)
        {
            string expected;
            if (!eligibleGuids.TryGetValue(path, out expected)) return false;
            string data = File.ReadAllText(Absolute(path));
            var identities = Regex.Matches(data, @"^guid: ([0-9a-fA-F]{32})\r?$", RegexOptions.Multiline);
            bool folder = Regex.IsMatch(data, @"^folderAsset: yes\r?$", RegexOptions.Multiline);
            return Regex.IsMatch(data, @"\AfileFormatVersion: 2\r?\n") && identities.Count == 1 &&
                identities[0].Groups[1].Value.ToLowerInvariant() == expected && folder == eligibleFolders.Contains(path);
        }
        ProtectedFileChange Change(string path, string classification, string previous, string current, string phase, string reason, bool allowed)
        {
            return new ProtectedFileChange { relativePath = path, classification = classification, previousSha256 = previous,
                currentSha256 = current, protectedRoot = RootOf(path), phase = phase, reason = reason, allowedGeneratedMetadata = allowed };
        }
        ProtectionDiffReport Report(string phase, int currentCount, IEnumerable<ProtectedFileChange> values)
        {
            var all = values.OrderBy(c => c.allowedGeneratedMetadata).ThenBy(c => c.relativePath, StringComparer.Ordinal).ToArray();
            return new ProtectionDiffReport { phase = phase, previousFileCount = files.Count, currentFileCount = currentCount,
                totalChanges = all.Length, rejectedCount = all.Count(c => !c.allowedGeneratedMetadata),
                allowedMetadataCount = all.Count(c => c.allowedGeneratedMetadata),
                omittedChanges = Math.Max(0, all.Length - MaximumReportedChanges), changes = all.Take(MaximumReportedChanges).ToArray() };
        }
        public ProtectionDiffReport AssertUnchanged(string phase)
        {
            Dictionary<string, string> current; HashSet<string> currentDirectories;
            Scan(out current, out currentDirectories);
            var changes = new List<ProtectedFileChange>();
            foreach (string path in files.Keys.Union(current.Keys, StringComparer.Ordinal).OrderBy(p => p, StringComparer.Ordinal))
            {
                string previousHash, currentHash;
                bool existed = files.TryGetValue(path, out previousHash), exists = current.TryGetValue(path, out currentHash);
                if (existed && exists && previousHash == currentHash) continue;
                bool allowed = !existed && exists && PermittedMetadata(path);
                changes.Add(Change(path, !existed ? "Added" : !exists ? "Removed" : "Modified", previousHash, currentHash, phase,
                    allowed ? "New uncommitted metadata for a pre-existing asset/folder; registered pre-generation GUID and header verified" :
                    "Protected source/metadata changed; no generated-output exception applies", allowed));
            }
            foreach (string directory in directories.Except(currentDirectories, StringComparer.Ordinal))
                changes.Add(Change(directory, "Removed", null, null, phase, "Protected directory removed", false));
            foreach (string directory in currentDirectories.Except(directories, StringComparer.Ordinal))
                changes.Add(Change(directory, "Added", null, null, phase, "Unexpected protected directory added", false));
            var report = Report(phase, current.Count, changes);
            if (report.rejectedCount != 0) throw new ProtectedFilesChangedException(report);
            // Adopt admitted metadata immediately: later modification/deletion must fail, even if its GUID stays unchanged.
            foreach (var pair in current.Where(p => !files.ContainsKey(p.Key)).ToArray())
            { files[pair.Key] = pair.Value; eligibleGuids.Remove(pair.Key); eligibleFolders.Remove(pair.Key); }
            return report;
        }
    }
}
