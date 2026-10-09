#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Text;

namespace Crownfall.EnvironmentLab.Editor
{
    [Serializable] public sealed class ProtectedFileChange
    {
        public string relativePath, classification, previousSha256, currentSha256, protectedRoot, phase, reason;
        public bool allowedGeneratedMetadata, allowedOwnedSettings;
        public bool Allowed { get { return allowedGeneratedMetadata || allowedOwnedSettings; } }
    }
    [Serializable] public sealed class ProtectionDiffReport
    {
        public string phase;
        public int previousFileCount, currentFileCount, totalChanges, rejectedCount, allowedMetadataCount, allowedOwnedSettingsCount, omittedChanges;
        public ProtectedFileChange[] changes;
    }
    public sealed class ProtectedFilesChangedException : InvalidOperationException
    {
        public readonly ProtectionDiffReport report;
        public ProtectedFilesChangedException(ProtectionDiffReport value) : base(Summary(value)) { report = value; }
        static string Summary(ProtectionDiffReport value)
        {
            var first = value.changes.FirstOrDefault(c => !c.Allowed);
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
        // Restricted YAML block mappings only. No anchors, tags, flow data, aliases, multiline scalars,
        // sequences, comments or importer schemas whose defaults have not been verified.
        static Dictionary<string, string> MetadataMapping(string data)
        {
            if (data.Length > 16384 || data.IndexOf('\t') >= 0 || data.IndexOf('\0') >= 0) return null;
            var result = new Dictionary<string, string>(StringComparer.Ordinal);
            bool importer = false;
            foreach (string raw in data.Replace("\r\n", "\n").Split('\n'))
            {
                if (raw.Length == 0) continue;
                int indent = raw.TakeWhile(c => c == ' ').Count();
                if (indent != 0 && indent != 2) return null;
                string line = raw.Substring(indent); int colon = line.IndexOf(':');
                if (colon < 1) return null;
                string key = line.Substring(0, colon).TrimEnd(' '), value = line.Substring(colon + 1).Trim(' ');
                if (!Regex.IsMatch(key, @"\A[A-Za-z][A-Za-z0-9]*\z")) return null;
                if (indent == 2 && !importer || indent == 0 && importer) return null;
                string path = (indent == 2 ? "DefaultImporter/" : "") + key;
                if (result.ContainsKey(path)) return null; // Normalized keys catch whitespace-varied duplicates.
                result.Add(path, value);
                if (indent == 0 && key == "DefaultImporter")
                { if (value != "") return null; importer = true; }
            }
            return result;
        }
        bool PermittedMetadata(string path)
        {
            string expected;
            if (!eligibleGuids.TryGetValue(path, out expected)) return false;
            bool folder = eligibleFolders.Contains(path);
            // Only verified DefaultImporter scene/folder schemas. Texture/Mono/Native/Model additions fail closed.
            if (!folder && !path.EndsWith(".unity.meta", StringComparison.Ordinal)) return false;
            var mapping = MetadataMapping(File.ReadAllText(Absolute(path)));
            if (mapping == null) return false;
            var required = new Dictionary<string, string>(StringComparer.Ordinal) {
                {"fileFormatVersion", "2"}, {"guid", expected}, {"DefaultImporter", ""}, {"DefaultImporter/externalObjects", "{}"} };
            if (folder) required.Add("folderAsset", "yes");
            foreach (var entry in required)
            { string value; if (!mapping.TryGetValue(entry.Key, out value) || value != entry.Value) return false; }
            foreach (var entry in mapping.Where(p => !required.ContainsKey(p.Key)))
                if (!(entry.Key == "DefaultImporter/userData" || entry.Key == "DefaultImporter/assetBundleName" ||
                    entry.Key == "DefaultImporter/assetBundleVariant") || entry.Value != "") return false;
            return true;
        }
        public ProtectionDiffReport AdmitUiShaderRetention(byte[] before, byte[] after, RetainedShaderReference[] required, string phase)
        {
            const string path = GraphicsShaderRetentionPolicy.Path;
            string baseline;
            string previous = HashBytes(before), current = HashBytes(after);
            if (!files.TryGetValue(path, out baseline) || baseline != previous || Hash(Absolute(path)) != current)
                throw new InvalidOperationException("GraphicsSettings ownership evidence does not match the original protected baseline");
            GraphicsShaderRetentionPolicy.Validate(before, after, required);
            var admitted = Change(path, "Modified", previous, current, phase,
                "Only seven validated built-in UI shader identities appended; all other serialized settings byte-identical", false);
            admitted.allowedOwnedSettings = true;
            return Compare(phase, previous == current ? null : admitted);
        }
        static string HashBytes(byte[] data)
        { using (var hash = SHA256.Create()) return BitConverter.ToString(hash.ComputeHash(data)).Replace("-", "").ToLowerInvariant(); }
        ProtectedFileChange Change(string path, string classification, string previous, string current, string phase, string reason, bool allowed)
        {
            return new ProtectedFileChange { relativePath = path, classification = classification, previousSha256 = previous,
                currentSha256 = current, protectedRoot = RootOf(path), phase = phase, reason = reason, allowedGeneratedMetadata = allowed };
        }
        ProtectionDiffReport Report(string phase, int currentCount, IEnumerable<ProtectedFileChange> values)
        {
            var all = values.OrderBy(c => c.Allowed).ThenBy(c => c.relativePath, StringComparer.Ordinal).ToArray();
            return new ProtectionDiffReport { phase = phase, previousFileCount = files.Count, currentFileCount = currentCount,
                totalChanges = all.Length, rejectedCount = all.Count(c => !c.Allowed),
                allowedMetadataCount = all.Count(c => c.allowedGeneratedMetadata),
                allowedOwnedSettingsCount = all.Count(c => c.allowedOwnedSettings),
                omittedChanges = Math.Max(0, all.Length - MaximumReportedChanges), changes = all.Take(MaximumReportedChanges).ToArray() };
        }
        public ProtectionDiffReport AssertUnchanged(string phase) { return Compare(phase, null); }
        ProtectionDiffReport Compare(string phase, ProtectedFileChange admitted)
        {
            Dictionary<string, string> current; HashSet<string> currentDirectories;
            Scan(out current, out currentDirectories);
            var changes = new List<ProtectedFileChange>();
            foreach (string path in files.Keys.Union(current.Keys, StringComparer.Ordinal).OrderBy(p => p, StringComparer.Ordinal))
            {
                string previousHash, currentHash;
                bool existed = files.TryGetValue(path, out previousHash), exists = current.TryGetValue(path, out currentHash);
                if (existed && exists && previousHash == currentHash) continue;
                if (admitted != null && path == admitted.relativePath && previousHash == admitted.previousSha256 && currentHash == admitted.currentSha256)
                { changes.Add(admitted); continue; }
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
            if (admitted != null) files[admitted.relativePath] = admitted.currentSha256;
            // Adopt admitted metadata immediately: later modification/deletion must fail, even if its GUID stays unchanged.
            foreach (var pair in current.Where(p => !files.ContainsKey(p.Key)).ToArray())
            { files[pair.Key] = pair.Value; eligibleGuids.Remove(pair.Key); eligibleFolders.Remove(pair.Key); }
            return report;
        }
    }
}
