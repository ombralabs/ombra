using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Playwright;

namespace OmbraLabs.Ombra;

/// <summary>
/// Options for <see cref="OmbraCdp.SetHumanizeAsync"/>.
/// </summary>
public sealed class SetHumanizeOptions
{
    public bool? Enabled { get; set; }

    /// <summary>Humanize preset: "default", "careful", or "fast".</summary>
    public string? Preset { get; set; }

    public IReadOnlyDictionary<string, object?>? Overrides { get; set; }
}

/// <summary>
/// Options for <see cref="OmbraCdp.AgentRunTaskAsync"/>.
/// </summary>
public sealed class AgentRunTaskOptions
{
    public required string TargetId { get; set; }

    public required string Goal { get; set; }

    public int? MaxSteps { get; set; }

    public string? Model { get; set; }

    public string? PlanJson { get; set; }
}

/// <summary>
/// State returned by <c>Ombra.getHumanizeState</c> and <c>Ombra.setHumanize</c>.
/// </summary>
public sealed class HumanizeState
{
    [JsonPropertyName("enabled")]
    public bool Enabled { get; set; }

    [JsonPropertyName("preset")]
    public string Preset { get; set; } = string.Empty;

    [JsonPropertyName("seed")]
    public string Seed { get; set; } = string.Empty;

    [JsonPropertyName("persona")]
    public JsonElement? Persona { get; set; }

    [JsonPropertyName("overrides")]
    public JsonElement? Overrides { get; set; }

    [JsonPropertyName("blockInput")]
    public bool BlockInput { get; set; }

    [JsonPropertyName("cursory")]
    public JsonElement? Cursory { get; set; }

    [JsonPropertyName("scrollTableError")]
    public string? ScrollTableError { get; set; }
}

/// <summary>
/// Result returned by <c>Browser.agentRunTask</c>.
/// </summary>
public sealed class AgentRunResult
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("finalText")]
    public string FinalText { get; set; } = string.Empty;

    [JsonPropertyName("stepsJson")]
    public string StepsJson { get; set; } = string.Empty;
}

/// <summary>
/// Browser-level CDP client for Ombra's custom <c>Ombra</c> and <c>Browser</c> domains.
/// </summary>
public sealed class OmbraCdp : IAsyncDisposable
{
    private static readonly HashSet<string> AllowedPresets = new(StringComparer.Ordinal)
    {
        "default",
        "careful",
        "fast",
    };

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private int _detached;

    public IBrowser Browser { get; }

    public ICDPSession Session { get; }

    internal OmbraCdp(IBrowser browser, ICDPSession session)
    {
        Browser = browser;
        Session = session;
    }

    /// <summary>Detach this browser CDP session without closing the browser.</summary>
    public async Task DetachAsync()
    {
        if (Interlocked.Exchange(ref _detached, 1) != 0)
        {
            return;
        }

        try
        {
            await Session.DetachAsync().ConfigureAwait(false);
        }
        catch (Exception)
        {
            // Ignore if browser or session already closed.
        }
    }

    public ValueTask DisposeAsync() => new(DetachAsync());

    /// <summary>
    /// Subscribe to an <c>Ombra.*</c> (or explicit <c>Domain.event</c>) CDP event.
    /// Dispose the returned handle to unsubscribe.
    /// </summary>
    public IDisposable On(string eventName, Action<JsonElement?> listener)
    {
        ArgumentNullException.ThrowIfNull(listener);
        var fullName = NormalizeEventName(eventName);
        var cdpEvent = Session.Event(fullName);
        EventHandler<JsonElement?> handler = (_, payload) => listener(payload);
        cdpEvent.OnEvent += handler;
        return new Subscription(() => cdpEvent.OnEvent -= handler);
    }

    /// <summary>Call <c>Ombra.getHumanizeState</c>.</summary>
    public async Task<HumanizeState> GetHumanizeStateAsync()
    {
        var result = await Session.SendAsync("Ombra.getHumanizeState").ConfigureAwait(false);
        return ParseHumanizeState(result);
    }

    /// <summary>Call <c>Ombra.setHumanize</c> to toggle or adjust humanized input on the fly.</summary>
    public async Task<HumanizeState> SetHumanizeAsync(SetHumanizeOptions? options = null)
    {
        Dictionary<string, object>? args = null;
        if (options is not null)
        {
            args = new Dictionary<string, object>(StringComparer.Ordinal);
            if (options.Enabled.HasValue)
            {
                args["enabled"] = options.Enabled.Value;
            }

            if (options.Preset is not null)
            {
                if (!AllowedPresets.Contains(options.Preset))
                {
                    throw new InvalidOptionException(
                        $"Preset must be 'default', 'careful', or 'fast', got '{options.Preset}'.");
                }

                args["preset"] = options.Preset;
            }

            if (options.Overrides is not null)
            {
                args["overrides"] = options.Overrides;
            }

            if (args.Count == 0)
            {
                args = null;
            }
        }

        var result = await Session.SendAsync("Ombra.setHumanize", args).ConfigureAwait(false);
        return ParseHumanizeState(result);
    }

    /// <summary>Call <c>Browser.agentRunTask</c> for Ombra's native in-browser AI agent.</summary>
    public async Task<AgentRunResult> AgentRunTaskAsync(AgentRunTaskOptions options)
    {
        if (options is null)
        {
            throw new InvalidOptionException("AgentRunTaskAsync requires an options object.");
        }

        if (string.IsNullOrWhiteSpace(options.TargetId))
        {
            throw new InvalidOptionException("TargetId must be a non-empty string.");
        }

        if (string.IsNullOrWhiteSpace(options.Goal))
        {
            throw new InvalidOptionException("Goal must be a non-empty string.");
        }

        var args = new Dictionary<string, object>(StringComparer.Ordinal)
        {
            ["targetId"] = options.TargetId,
            ["goal"] = options.Goal,
        };

        if (options.MaxSteps.HasValue)
        {
            if (options.MaxSteps.Value < 1)
            {
                throw new InvalidOptionException("MaxSteps must be an integer >= 1.");
            }

            args["maxSteps"] = options.MaxSteps.Value;
        }

        if (options.Model is not null)
        {
            if (string.IsNullOrWhiteSpace(options.Model))
            {
                throw new InvalidOptionException("Model must be a non-empty string.");
            }

            args["model"] = options.Model;
        }

        if (options.PlanJson is not null)
        {
            args["planJson"] = options.PlanJson;
        }

        var result = await Session.SendAsync("Browser.agentRunTask", args).ConfigureAwait(false);
        if (result is null)
        {
            return new AgentRunResult();
        }

        return JsonSerializer.Deserialize<AgentRunResult>(result.Value.GetRawText(), JsonOptions)
            ?? new AgentRunResult();
    }

    internal static string NormalizeEventName(string eventName)
    {
        if (string.IsNullOrWhiteSpace(eventName))
        {
            throw new InvalidOptionException("CDP event name must be a non-empty string.");
        }

        var trimmed = eventName.Trim();
        var dot = trimmed.IndexOf('.');
        if (dot != -1)
        {
            var domain = trimmed[..dot];
            var shortName = trimmed[(dot + 1)..];
            if (string.IsNullOrEmpty(domain) || string.IsNullOrEmpty(shortName))
            {
                throw new InvalidOptionException($"Invalid CDP event name '{eventName}'.");
            }

            return $"{domain}.{shortName}";
        }

        return $"Ombra.{trimmed}";
    }

    private static HumanizeState ParseHumanizeState(JsonElement? result)
    {
        if (result is null || result.Value.ValueKind != JsonValueKind.Object)
        {
            return new HumanizeState();
        }

        var target = result.Value.TryGetProperty("state", out var stateProp) &&
            stateProp.ValueKind == JsonValueKind.Object
            ? stateProp
            : result.Value;

        return JsonSerializer.Deserialize<HumanizeState>(target.GetRawText(), JsonOptions)
            ?? new HumanizeState();
    }

    private sealed class Subscription(Action unsubscribe) : IDisposable
    {
        private int _disposed;

        public void Dispose()
        {
            if (Interlocked.Exchange(ref _disposed, 1) != 0)
            {
                return;
            }

            try
            {
                unsubscribe();
            }
            catch (Exception)
            {
            }
        }
    }
}
