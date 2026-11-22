using System.Diagnostics;
using System.Formats.Tar;
using System.IO.Compression;
using System.Text;

namespace OmbraLabs.Ombra;

/// <summary>
/// Zip-Slip / Tar-Slip safe extractors for .zip, .tar.gz, and .tar.xz engine archives.
/// </summary>
internal static class ArchiveExtractor
{
    private const int UnixFileTypeMask = 0xF000;
    private const int UnixSymlinkType = 0xA000;
    private const int UnixPermissionMask = 0x1FF;

    private static bool IsWithinRoot(string candidatePath, string resolvedRoot)
    {
        var fullCandidate = Path.GetFullPath(candidatePath);
        var rel = Path.GetRelativePath(resolvedRoot, fullCandidate);
        return rel == "." || (!rel.StartsWith("..", StringComparison.Ordinal) && !Path.IsPathRooted(rel));
    }

    private static string AssertSafeRelativeEntry(string entryName, string resolvedRoot)
    {
        var normalized = entryName.Replace('\\', '/');
        if (string.IsNullOrEmpty(normalized) || normalized.StartsWith('/'))
        {
            throw new ChecksumMismatchException($"Archive entry has unsafe absolute path: '{entryName}'.");
        }

        var parts = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Where(p => p != ".")
            .ToArray();
        if (parts.Any(p => p == ".."))
        {
            throw new ChecksumMismatchException($"Archive entry escapes destination directory: '{entryName}'.");
        }

        var candidate = parts.Length == 0
            ? resolvedRoot
            : Path.GetFullPath(Path.Combine([resolvedRoot, .. parts]));
        if (!IsWithinRoot(candidate, resolvedRoot))
        {
            throw new ChecksumMismatchException($"Archive entry escapes destination directory: '{entryName}'.");
        }

        return candidate;
    }

    public static Task SafeExtractZipAsync(string archivePath, string destDir, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        Directory.CreateDirectory(destDir);
        var resolvedRoot = OmbraConfig.ResolveRealPath(destDir);

        try
        {
            using var archive = ZipFile.OpenRead(archivePath);
            foreach (var entry in archive.Entries)
            {
                ct.ThrowIfCancellationRequested();
                var unixMode = (entry.ExternalAttributes >> 16) & UnixFileTypeMask;
                if (unixMode == UnixSymlinkType)
                {
                    throw new ChecksumMismatchException(
                        $"Archive contains unsupported symlink entry: '{entry.FullName}'.");
                }

                var cleaned = entry.FullName.TrimEnd('/', '\\');
                if (string.IsNullOrEmpty(cleaned))
                {
                    continue;
                }

                var targetPath = AssertSafeRelativeEntry(cleaned, resolvedRoot);
                if (entry.FullName.EndsWith('/') || entry.FullName.EndsWith('\\'))
                {
                    Directory.CreateDirectory(targetPath);
                    continue;
                }

                var parent = Path.GetDirectoryName(targetPath);
                if (!string.IsNullOrEmpty(parent))
                {
                    Directory.CreateDirectory(parent);
                }

                entry.ExtractToFile(targetPath, overwrite: true);
                if (!OperatingSystem.IsWindows())
                {
                    var perms = (entry.ExternalAttributes >> 16) & UnixPermissionMask;
                    if (perms != 0)
                    {
                        File.SetUnixFileMode(targetPath, (UnixFileMode)perms);
                    }
                }
            }
        }
        catch (ChecksumMismatchException)
        {
            throw;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new DownloadFailedException($"Failed to extract zip archive: {ex.Message}", innerException: ex);
        }

        return Task.CompletedTask;
    }

    public static async Task SafeExtractTarGzAsync(string archivePath, string destDir, CancellationToken ct = default)
    {
        try
        {
            await using var fileStream = File.OpenRead(archivePath);
            await using var gzipStream = new GZipStream(fileStream, CompressionMode.Decompress);
            await ExtractTarStreamAsync(gzipStream, destDir, ct).ConfigureAwait(false);
        }
        catch (OmbraException)
        {
            throw;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new DownloadFailedException($"Failed to extract tar.gz archive: {ex.Message}", innerException: ex);
        }
    }

    public static async Task SafeExtractTarXzAsync(string archivePath, string destDir, CancellationToken ct = default)
    {
        using var proc = new Process();
        proc.StartInfo = new ProcessStartInfo("xz")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        proc.StartInfo.ArgumentList.Add("-dc");
        proc.StartInfo.ArgumentList.Add("--");
        proc.StartInfo.ArgumentList.Add(archivePath);

        try
        {
            proc.Start();
        }
        catch (Exception ex)
        {
            throw new DownloadFailedException(
                "XZ extraction requires xz on PATH (install XZ Utils / xz-utils).",
                innerException: ex);
        }

        var stderrTask = ReadCappedAsync(proc.StandardError, 8192, ct);
        try
        {
            await ExtractTarStreamAsync(proc.StandardOutput.BaseStream, destDir, ct).ConfigureAwait(false);
            await proc.WaitForExitAsync(ct).ConfigureAwait(false);
            var stderr = await stderrTask.ConfigureAwait(false);
            if (proc.ExitCode != 0)
            {
                throw new DownloadFailedException(
                    $"xz failed to decode tar.xz archive (exit {proc.ExitCode}): {stderr.Trim()}");
            }
        }
        catch
        {
            try
            {
                if (!proc.HasExited)
                {
                    proc.Kill(entireProcessTree: true);
                }
            }
            catch (Exception)
            {
            }

            throw;
        }
    }

    private static async Task<string> ReadCappedAsync(StreamReader reader, int maxChars, CancellationToken ct)
    {
        var sb = new StringBuilder();
        var buf = new char[1024];
        int read;
        while ((read = await reader.ReadAsync(buf.AsMemory(0, buf.Length), ct).ConfigureAwait(false)) > 0)
        {
            if (sb.Length < maxChars)
            {
                var take = Math.Min(read, maxChars - sb.Length);
                sb.Append(buf, 0, take);
            }
        }

        return sb.ToString();
    }

    internal static async Task ExtractTarStreamAsync(Stream tarStream, string destDir, CancellationToken ct = default)
    {
        Directory.CreateDirectory(destDir);
        var resolvedRoot = OmbraConfig.ResolveRealPath(destDir);
        var deferredSymlinks = new List<(string TargetPath, string LinkTarget)>();

        await using var reader = new TarReader(tarStream, leaveOpen: true);
        TarEntry? entry;
        while ((entry = await reader.GetNextEntryAsync(copyData: false, ct).ConfigureAwait(false)) is not null)
        {
            if (entry.EntryType is TarEntryType.CharacterDevice or TarEntryType.BlockDevice or TarEntryType.Fifo)
            {
                throw new ChecksumMismatchException(
                    $"Archive contains unsupported device node: '{entry.Name}'.");
            }

            if (entry.EntryType is TarEntryType.GlobalExtendedAttributes or TarEntryType.ExtendedAttributes)
            {
                continue;
            }

            var cleaned = entry.Name.TrimEnd('/');
            if (string.IsNullOrEmpty(cleaned) || cleaned == ".")
            {
                continue;
            }

            var targetPath = AssertSafeRelativeEntry(cleaned, resolvedRoot);

            if (entry.EntryType == TarEntryType.Directory || entry.Name.EndsWith('/'))
            {
                Directory.CreateDirectory(targetPath);
                continue;
            }

            if (entry.EntryType is TarEntryType.SymbolicLink or TarEntryType.HardLink)
            {
                var linkName = entry.LinkName;
                if (string.IsNullOrEmpty(linkName) || Path.IsPathRooted(linkName) || linkName.StartsWith('/'))
                {
                    throw new ChecksumMismatchException(
                        $"Archive contains unsafe absolute link target: '{entry.Name}' -> '{linkName}'.");
                }

                var baseForLink = entry.EntryType == TarEntryType.SymbolicLink
                    ? Path.GetDirectoryName(targetPath)!
                    : resolvedRoot;
                var resolvedLink = Path.GetFullPath(Path.Combine(baseForLink, linkName));
                if (!IsWithinRoot(resolvedLink, resolvedRoot))
                {
                    throw new ChecksumMismatchException(
                        $"Archive link escapes destination directory: '{entry.Name}' -> '{linkName}'.");
                }

                if (entry.EntryType == TarEntryType.SymbolicLink)
                {
                    deferredSymlinks.Add((targetPath, linkName));
                }
                else
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(targetPath)!);
                    if (File.Exists(targetPath))
                    {
                        File.Delete(targetPath);
                    }

                    File.Copy(resolvedLink, targetPath, overwrite: true);
                }

                continue;
            }

            if (entry.EntryType is TarEntryType.RegularFile or TarEntryType.V7RegularFile)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(targetPath)!);
                await using (var outStream = new FileStream(targetPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    if (entry.DataStream is not null)
                    {
                        await entry.DataStream.CopyToAsync(outStream, ct).ConfigureAwait(false);
                    }
                }

                if (!OperatingSystem.IsWindows())
                {
                    var perms = (int)entry.Mode & UnixPermissionMask;
                    if (perms != 0)
                    {
                        File.SetUnixFileMode(targetPath, (UnixFileMode)perms);
                    }
                }
            }
        }

        foreach (var (targetPath, linkTarget) in deferredSymlinks)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(targetPath)!);
            if (File.Exists(targetPath))
            {
                File.Delete(targetPath);
            }

            File.CreateSymbolicLink(targetPath, linkTarget);
        }
    }
}
