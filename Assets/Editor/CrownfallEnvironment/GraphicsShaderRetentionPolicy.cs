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
        public readonly int referenceType;
        public RetainedShaderReference(string identity, long id) : this(identity,id,0) { }
        public RetainedShaderReference(string identity, long id, int type) { guid = identity; fileId = id; referenceType = type; }
        public string Key { get { return fileId + ":" + guid + ":" + referenceType; } }
    }
    // Only this one serialized setting may change, and only by appending missing required built-in shaders.
    public static class GraphicsShaderRetentionPolicy
    {
        public const string Path = "ProjectSettings/GraphicsSettings.asset";
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
        // Derive the reference type from actual native PanelSettings output, never a guessed built-in GUID.
        public static RetainedShaderReference ReadPanelReference(byte[] panel, string field, RetainedShaderReference identity)
        {
            if (!Regex.IsMatch(field, @"\Am_[A-Za-z0-9]+\z")) throw new InvalidOperationException("Invalid UI shader field");
            string text = new UTF8Encoding(false,true).GetString(panel);
            var matches = Regex.Matches(text, @"^  " + Regex.Escape(field) + @": \{fileID: (-?[0-9]+), guid: ([0-9a-f]{32}), type: ([023])\}\r?$", RegexOptions.Multiline);
            if (matches.Count != 1) throw new InvalidOperationException("Unsupported/missing native PanelSettings shader reference: " + field);
            var match = matches[0]; long fileId;
            if (!long.TryParse(match.Groups[1].Value,out fileId) || identity == null || fileId != identity.fileId || match.Groups[2].Value != identity.guid)
                throw new InvalidOperationException("Native PanelSettings shader identity differs from resolved Shader.Find binding: " + field);
            return new RetainedShaderReference(identity.guid,fileId,int.Parse(match.Groups[3].Value));
        }
        public static void Validate(byte[] before, byte[] after, RetainedShaderReference[] expectedShaders)
        {
            var strictUtf8 = new UTF8Encoding(false, true);
            var a = Parse(strictUtf8.GetString(before)); var b = Parse(strictUtf8.GetString(after));
            if (a.prefix != b.prefix || a.suffix != b.suffix)
                throw new InvalidOperationException("UI shader retention changed another GraphicsSettings field");
            if (expectedShaders == null || expectedShaders.Length != 7 || expectedShaders.Any(r => r == null || r.guid == null || !Regex.IsMatch(r.guid, @"\A[0-9a-f]{32}\z") || r.fileId == 0 || !(r.referenceType == 0 || r.referenceType == 2 || r.referenceType == 3)) ||
                expectedShaders.Select(r => r.Key).Distinct(StringComparer.Ordinal).Count() != 7)
                throw new InvalidOperationException("Expected seven distinct native UI shader identities; native verification required");
            var expected = a.references.ToList();
            foreach (var reference in expectedShaders) if (!expected.Contains(reference.Key)) expected.Add(reference.Key);
            if (!expected.SequenceEqual(b.references))
                throw new InvalidOperationException("UI shader retention removed/reordered references or added an unapproved shader");
        }
    }
}
