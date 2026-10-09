#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace Crownfall.EnvironmentLab.Editor
{
    public sealed class RetainedShaderReference
    {
        public readonly string guid;
        public readonly long fileId;
        public RetainedShaderReference(string identity, long id) { guid = identity; fileId = id; }
        public string Key { get { return fileId + ":" + guid + ":0"; } }
    }
    // Only this one serialized setting may change, and only by appending missing required built-in shaders.
    public static class GraphicsShaderRetentionPolicy
    {
        public const string Path = "ProjectSettings/GraphicsSettings.asset";
        public const string BuiltinGuid = "0000000000000000f0000000000000000";
        sealed class Section { public string prefix, suffix; public string[] references; }
        static Section Parse(string text)
        {
            var lines = text.Split('\n');
            var indices = Enumerable.Range(0, lines.Length).Where(i =>
                lines[i].TrimEnd('\r') == "  m_AlwaysIncludedShaders:" ||
                lines[i].TrimEnd('\r') == "  m_AlwaysIncludedShaders: []").ToArray();
            if (indices.Length != 1 || !text.Contains("\nGraphicsSettings:\n") && !text.Contains("\nGraphicsSettings:\r\n"))
                throw new InvalidOperationException("Unsupported GraphicsSettings serialization; native verification required");
            int start = indices[0], end = start + 1;
            var refs = new List<string>();
            while (end < lines.Length && lines[end].StartsWith("  -", StringComparison.Ordinal))
            {
                var line = lines[end].TrimEnd('\r');
                if (line == "  - {fileID: 0}") refs.Add("0");
                else
                {
                    var match = Regex.Match(line, @"\A  - \{fileID: (-?[0-9]+), guid: ([0-9a-f]{32}), type: ([023])\}\z");
                    if (!match.Success) throw new InvalidOperationException("Unsupported Always Included shader reference");
                    refs.Add(match.Groups[1].Value + ":" + match.Groups[2].Value + ":" + match.Groups[3].Value);
                }
                end++;
            }
            if (lines[start].TrimEnd('\r').EndsWith("[]", StringComparison.Ordinal) && refs.Count != 0)
                throw new InvalidOperationException("Malformed shader list");
            return new Section { prefix = string.Join("\n", lines.Take(start)), suffix = string.Join("\n", lines.Skip(end)), references = refs.ToArray() };
        }
        public static void Validate(byte[] before, byte[] after, RetainedShaderReference[] required)
        {
            var strictUtf8 = new UTF8Encoding(false, true);
            var a = Parse(strictUtf8.GetString(before)); var b = Parse(strictUtf8.GetString(after));
            if (a.prefix != b.prefix || a.suffix != b.suffix)
                throw new InvalidOperationException("UI shader retention changed another GraphicsSettings field");
            if (required == null || required.Length != 7 || required.Any(r => r == null || r.guid != BuiltinGuid || r.fileId == 0) ||
                required.Select(r => r.Key).Distinct(StringComparer.Ordinal).Count() != 7)
                throw new InvalidOperationException("Expected seven distinct native built-in UI shader identities; native verification required");
            var expected = a.references.ToList();
            foreach (var reference in required) if (!expected.Contains(reference.Key)) expected.Add(reference.Key);
            if (!expected.SequenceEqual(b.references))
                throw new InvalidOperationException("UI shader retention removed/reordered references or added an unapproved shader");
        }
    }
}
