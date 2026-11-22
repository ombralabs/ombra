using System.Text.RegularExpressions;

namespace OmbraLabs.Ombra;

/// <summary>
/// Stable error kinds defined by the Ombra SDK API contract (§11).
/// </summary>
public enum ErrorKind
{
    OmbraError,
    InvalidOption,
    BinaryNotFound,
    DownloadFailed,
    ChecksumMismatch,
    UnsupportedPlatform,
    UnsupportedEngine,
    LicenseError,
    ProxyError,
    ProfileBusy,
    LaunchTimeout,
    CDPConnectError,
    EngineExited,
    EngineCrashed,
}

/// <summary>
/// Redacts proxy credentials, license keys, auth headers, URL tokens, and CDP session tokens
/// from error messages, diagnostics, and logs (SI-06 / SI-10).
/// </summary>
public static partial class SecretRedactor
{
    [GeneratedRegex(@"([a-zA-Z][a-zA-Z0-9+.-]*://)([^/\s""'?#]*)@")]
    private static partial Regex UrlUserinfoRegex();

    [GeneratedRegex(@"(OMBRA_LICENSE_KEY=)([^\s""']+)")]
    private static partial Regex LicenseEnvRegex();

    [GeneratedRegex(@"(Authorization\s*:\s*(?:Basic|Bearer|License)\s+)([^\s""']+)", RegexOptions.IgnoreCase)]
    private static partial Regex AuthHeaderRegex();

    [GeneratedRegex(@"([?&](?:auth|authorization|token|access_token|refresh_token|api_key|key|license_key)=)([^&#\s""'<>]+)", RegexOptions.IgnoreCase)]
    private static partial Regex UrlTokenRegex();

    [GeneratedRegex(@"(/devtools/browser/)([^/?#\s""'<>]+)", RegexOptions.IgnoreCase)]
    private static partial Regex CdpSessionRegex();

    [GeneratedRegex(@"^(?:user|username|authorization|proxyauthorization|cookie|setcookie|credentials)$|(?:password|passwd|pwd|secret|token|apikey|licensekey)$", RegexOptions.IgnoreCase)]
    private static partial Regex CredentialKeyRegex();

    public static string Redact(string text, IEnumerable<string>? extraSecrets = null)
    {
        if (string.IsNullOrEmpty(text))
        {
            return text;
        }

        var result = UrlUserinfoRegex().Replace(text, static match =>
        {
            var scheme = match.Groups[1].Value;
            var auth = match.Groups[2].Value;
            return auth.Contains(':') ? $"{scheme}***:***@" : $"{scheme}***@";
        });
        result = LicenseEnvRegex().Replace(result, "$1***");
        result = AuthHeaderRegex().Replace(result, "$1***");
        result = UrlTokenRegex().Replace(result, "$1***");
        result = CdpSessionRegex().Replace(result, "$1***");

        if (extraSecrets is not null)
        {
            foreach (var secret in extraSecrets)
            {
                if (!string.IsNullOrEmpty(secret))
                {
                    result = result.Replace(secret, "***", StringComparison.Ordinal);
                }
            }
        }

        return result;
    }

    internal static IReadOnlyDictionary<string, object?> RedactDetails(
        IReadOnlyDictionary<string, object?>? details,
        IReadOnlyList<string> secrets)
    {
        if (details is null || details.Count == 0)
        {
            return new Dictionary<string, object?>();
        }

        var result = new Dictionary<string, object?>(details.Count, StringComparer.Ordinal);
        foreach (var (key, value) in details)
        {
            var cleanKey = Redact(key, secrets);
            var normalizedKey = key.Replace("-", string.Empty, StringComparison.Ordinal)
                .Replace("_", string.Empty, StringComparison.Ordinal)
                .Replace(" ", string.Empty, StringComparison.Ordinal);
            result[cleanKey] = CredentialKeyRegex().IsMatch(normalizedKey)
                ? "***"
                : RedactValue(value, secrets);
        }

        return result;
    }

    private static object? RedactValue(object? value, IReadOnlyList<string> secrets)
    {
        return value switch
        {
            null => null,
            string s => Redact(s, secrets),
            IReadOnlyDictionary<string, object?> dict => RedactDetails(dict, secrets),
            IDictionary<string, object?> dict => RedactDetails(
                new Dictionary<string, object?>(dict), secrets),
            IEnumerable<string> strings => strings.Select(s => Redact(s, secrets)).ToArray(),
            _ => value,
        };
    }
}

/// <summary>
/// Base exception for all Ombra SDK errors. Messages and details are automatically secret-redacted.
/// </summary>
public class OmbraException : Exception
{
    public ErrorKind Kind { get; }

    public IReadOnlyDictionary<string, object?> Details { get; }

    public OmbraException(
        string message,
        ErrorKind kind = ErrorKind.OmbraError,
        IReadOnlyDictionary<string, object?>? details = null,
        IEnumerable<string>? secrets = null,
        Exception? innerException = null)
        : base(RedactMessage(message, secrets, out var secretList), innerException)
    {
        Kind = kind;
        Details = SecretRedactor.RedactDetails(details, secretList);
    }

    private static string RedactMessage(
        string message,
        IEnumerable<string>? secrets,
        out List<string> secretList)
    {
        secretList = secrets?.Where(s => !string.IsNullOrEmpty(s)).ToList() ?? [];
        return SecretRedactor.Redact(message, secretList);
    }
}

public sealed class InvalidOptionException : OmbraException
{
    public InvalidOptionException(
        string message,
        IReadOnlyDictionary<string, object?>? details = null,
        IEnumerable<string>? secrets = null,
        Exception? innerException = null)
        : base(message, ErrorKind.InvalidOption, details, secrets, innerException)
    {
    }
}

public sealed class BinaryNotFoundException : OmbraException
{
    public BinaryNotFoundException(
        string message,
        IReadOnlyDictionary<string, object?>? details = null,
        IEnumerable<string>? secrets = null,
        Exception? innerException = null)
        : base(message, ErrorKind.BinaryNotFound, details, secrets, innerException)
    {
    }
}

public sealed class DownloadFailedException : OmbraException
{
    public DownloadFailedException(
        string message,
        IReadOnlyDictionary<string, object?>? details = null,
        IEnumerable<string>? secrets = null,
        Exception? innerException = null)
        : base(message, ErrorKind.DownloadFailed, details, secrets, innerException)
    {
    }
}

public sealed class ChecksumMismatchException : OmbraException
{
    public ChecksumMismatchException(
        string message,
        IReadOnlyDictionary<string, object?>? details = null,
        IEnumerable<string>? secrets = null,
        Exception? innerException = null)
        : base(message, ErrorKind.ChecksumMismatch, details, secrets, innerException)
    {
    }
}

public sealed class UnsupportedPlatformException : OmbraException
{
    public UnsupportedPlatformException(
        string message,
        IReadOnlyDictionary<string, object?>? details = null,
        IEnumerable<string>? secrets = null,
        Exception? innerException = null)
        : base(message, ErrorKind.UnsupportedPlatform, details, secrets, innerException)
    {
    }
}

public sealed class UnsupportedEngineException : OmbraException
{
    public UnsupportedEngineException(
        string message,
        IReadOnlyDictionary<string, object?>? details = null,
        IEnumerable<string>? secrets = null,
        Exception? innerException = null)
        : base(message, ErrorKind.UnsupportedEngine, details, secrets, innerException)
    {
    }
}

public sealed class LicenseException : OmbraException
{
    public LicenseException(
        string message,
        IReadOnlyDictionary<string, object?>? details = null,
        IEnumerable<string>? secrets = null,
        Exception? innerException = null)
        : base(message, ErrorKind.LicenseError, details, secrets, innerException)
    {
    }
}

public sealed class ProxyException : OmbraException
{
    public ProxyException(
        string message,
        IReadOnlyDictionary<string, object?>? details = null,
        IEnumerable<string>? secrets = null,
        Exception? innerException = null)
        : base(message, ErrorKind.ProxyError, details, secrets, innerException)
    {
    }
}

public sealed class ProfileBusyException : OmbraException
{
    public ProfileBusyException(
        string message,
        IReadOnlyDictionary<string, object?>? details = null,
        IEnumerable<string>? secrets = null,
        Exception? innerException = null)
        : base(message, ErrorKind.ProfileBusy, details, secrets, innerException)
    {
    }
}

public sealed class LaunchTimeoutException : OmbraException
{
    public LaunchTimeoutException(
        string message,
        IReadOnlyDictionary<string, object?>? details = null,
        IEnumerable<string>? secrets = null,
        Exception? innerException = null)
        : base(message, ErrorKind.LaunchTimeout, details, secrets, innerException)
    {
    }
}

public sealed class CdpConnectException : OmbraException
{
    public CdpConnectException(
        string message,
        IReadOnlyDictionary<string, object?>? details = null,
        IEnumerable<string>? secrets = null,
        Exception? innerException = null)
        : base(message, ErrorKind.CDPConnectError, details, secrets, innerException)
    {
    }
}

public sealed class EngineExitedException : OmbraException
{
    public EngineExitedException(
        string message,
        IReadOnlyDictionary<string, object?>? details = null,
        IEnumerable<string>? secrets = null,
        Exception? innerException = null)
        : base(message, ErrorKind.EngineExited, details, secrets, innerException)
    {
    }
}

public sealed class EngineCrashedException : OmbraException
{
    public EngineCrashedException(
        string message,
        IReadOnlyDictionary<string, object?>? details = null,
        IEnumerable<string>? secrets = null,
        Exception? innerException = null)
        : base(message, ErrorKind.EngineCrashed, details, secrets, innerException)
    {
    }
}
