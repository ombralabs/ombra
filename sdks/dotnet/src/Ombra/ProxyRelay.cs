using System.Buffers.Binary;
using System.Collections.Concurrent;
using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Text;

namespace OmbraLabs.Ombra;

internal sealed class NormalizedProxy
{
    public string Scheme { get; }
    public string Host { get; }
    public int Port { get; }
    public string? Username { get; }
    public string? Password { get; }
    public string? Bypass { get; }

    public bool HasCredentials => Username is not null || Password is not null;

    public string ServerUrl
    {
        get
        {
            var hostFmt = Host.Contains(':') && !Host.StartsWith('[') ? $"[{Host}]" : Host;
            return $"{Scheme}://{hostFmt}:{Port}";
        }
    }

    public NormalizedProxy(
        string scheme,
        string host,
        int port,
        string? username = null,
        string? password = null,
        string? bypass = null)
    {
        Scheme = scheme == "socks5h" ? "socks5" : scheme;
        Host = host.Trim('[', ']');
        Port = port;
        Username = username;
        Password = password;
        Bypass = bypass;
    }

    public string[] Secrets()
    {
        var list = new List<string>(2);
        if (!string.IsNullOrEmpty(Username))
        {
            list.Add(Username);
        }

        if (!string.IsNullOrEmpty(Password))
        {
            list.Add(Password);
        }

        return [.. list];
    }

    public override string ToString() => $"NormalizedProxy(scheme='{Scheme}', host='{Host}', port={Port})";
}

internal static class ProxyParser
{
    private static readonly HashSet<string> AllowedSchemes = new(StringComparer.Ordinal)
    {
        "http",
        "https",
        "socks5",
        "socks5h",
    };

    public static NormalizedProxy? Parse(ProxyOption? proxy)
    {
        if (proxy is null)
        {
            return null;
        }

        var hasServer = proxy.Server is not null;
        var hasStructured = proxy.Type is not null || proxy.Host is not null || proxy.Port is not null;

        if (hasServer && hasStructured)
        {
            throw new InvalidOptionException(
                "Proxy cannot combine 'Server' with structured 'Type'/'Host'/'Port' fields.");
        }

        NormalizedProxy baseProxy;
        string? username;
        string? password;

        if (hasServer)
        {
            if (string.IsNullOrWhiteSpace(proxy.Server))
            {
                throw new InvalidOptionException("Proxy.Server must be a non-empty string.");
            }

            baseProxy = ParseString(proxy.Server);
            username = proxy.Username ?? baseProxy.Username;
            password = proxy.Password ?? baseProxy.Password;
        }
        else
        {
            if (proxy.Type is null)
            {
                throw new InvalidOptionException("Proxy object is missing required field 'Type'.");
            }

            if (proxy.Host is null)
            {
                throw new InvalidOptionException("Proxy object is missing required field 'Host'.");
            }

            if (proxy.Port is null)
            {
                throw new InvalidOptionException("Proxy object is missing required field 'Port'.");
            }

            var scheme = proxy.Type.Trim().ToLowerInvariant();
            if (scheme is not ("http" or "https" or "socks5"))
            {
                throw new InvalidOptionException(
                    $"Proxy.Type must be 'http', 'https', or 'socks5', got '{proxy.Type}'.");
            }

            if (string.IsNullOrWhiteSpace(proxy.Host))
            {
                throw new InvalidOptionException("Proxy.Host must be a non-empty string.");
            }

            if (proxy.Port.Value is < 1 or > 65535)
            {
                throw new InvalidOptionException("Proxy.Port must be an integer between 1 and 65535.");
            }

            baseProxy = new NormalizedProxy(scheme, proxy.Host.Trim(), proxy.Port.Value);
            username = proxy.Username;
            password = proxy.Password;
        }

        ValidateSocks5CredLengths(baseProxy.Scheme, username, password);
        return new NormalizedProxy(baseProxy.Scheme, baseProxy.Host, baseProxy.Port, username, password, proxy.Bypass);
    }

    public static NormalizedProxy ParseString(string raw)
    {
        var trimmed = raw.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            throw new InvalidOptionException("Proxy string cannot be empty.");
        }

        var withScheme = trimmed.Contains("://", StringComparison.Ordinal) ? trimmed : $"http://{trimmed}";
        var sepIdx = withScheme.IndexOf("://", StringComparison.Ordinal);
        if (sepIdx <= 0)
        {
            throw new ProxyException("Invalid proxy URL.");
        }

        var schemeLower = withScheme[..sepIdx].ToLowerInvariant();
        if (!AllowedSchemes.Contains(schemeLower))
        {
            throw new InvalidOptionException(
                $"Unsupported proxy scheme '{schemeLower}'; expected http, https, or socks5.");
        }

        var rest = withScheme[(sepIdx + 3)..];
        var pathIdx = rest.IndexOfAny(['/', '?', '#']);
        var authority = pathIdx == -1 ? rest : rest[..pathIdx];
        var atIdx = authority.LastIndexOf('@');

        string? username = null;
        string? password = null;
        var hostPort = atIdx == -1 ? authority : authority[(atIdx + 1)..];

        if (atIdx != -1)
        {
            var userinfo = authority[..atIdx];
            var colonIdx = userinfo.IndexOf(':');
            if (colonIdx == -1)
            {
                username = LenientPercentDecode(userinfo);
            }
            else
            {
                username = LenientPercentDecode(userinfo[..colonIdx]);
                password = LenientPercentDecode(userinfo[(colonIdx + 1)..]);
            }
        }

        string host;
        string portStr;
        if (hostPort.StartsWith('['))
        {
            var closeBracket = hostPort.IndexOf(']');
            if (closeBracket == -1 || closeBracket + 1 >= hostPort.Length || hostPort[closeBracket + 1] != ':')
            {
                throw new ProxyException("Proxy URL must include a valid host and port (1..65535).");
            }

            host = hostPort[1..closeBracket];
            portStr = hostPort[(closeBracket + 2)..];
        }
        else
        {
            var colon = hostPort.LastIndexOf(':');
            if (colon == -1)
            {
                throw new ProxyException("Proxy URL must include a valid host and port (1..65535).");
            }

            host = hostPort[..colon];
            portStr = hostPort[(colon + 1)..];
        }

        if (string.IsNullOrEmpty(host) || !portStr.All(char.IsAsciiDigit) || !int.TryParse(portStr, out var port))
        {
            throw new ProxyException("Proxy URL must include a valid host and port (1..65535).");
        }

        if (port is < 1 or > 65535)
        {
            throw new ProxyException("Proxy URL port must be between 1 and 65535.");
        }

        var normalizedScheme = schemeLower == "socks5h" ? "socks5" : schemeLower;
        ValidateSocks5CredLengths(normalizedScheme, username, password);
        return new NormalizedProxy(normalizedScheme, host, port, username, password);
    }

    private static void ValidateSocks5CredLengths(string scheme, string? username, string? password)
    {
        if (scheme is not ("socks5" or "socks5h"))
        {
            return;
        }

        if (username is not null && Encoding.UTF8.GetByteCount(username) > 255)
        {
            throw new ProxyException("SOCKS5 proxy username exceeds 255 bytes.");
        }

        if (password is not null && Encoding.UTF8.GetByteCount(password) > 255)
        {
            throw new ProxyException("SOCKS5 proxy password exceeds 255 bytes.");
        }
    }

    private static string LenientPercentDecode(string text)
    {
        if (!text.Contains('%'))
        {
            return text;
        }

        var bytes = new List<byte>(text.Length);
        var i = 0;
        while (i < text.Length)
        {
            if (text[i] == '%' && i + 2 < text.Length &&
                TryHex(text[i + 1], out var hi) &&
                TryHex(text[i + 2], out var lo))
            {
                bytes.Add((byte)((hi << 4) | lo));
                i += 3;
            }
            else
            {
                var charBytes = Encoding.UTF8.GetBytes(text.AsSpan(i, 1).ToString());
                bytes.AddRange(charBytes);
                i++;
            }
        }

        return Encoding.UTF8.GetString(bytes.ToArray());
    }

    private static bool TryHex(char c, out int value)
    {
        if (c is >= '0' and <= '9')
        {
            value = c - '0';
            return true;
        }

        if (c is >= 'a' and <= 'f')
        {
            value = c - 'a' + 10;
            return true;
        }

        if (c is >= 'A' and <= 'F')
        {
            value = c - 'A' + 10;
            return true;
        }

        value = 0;
        return false;
    }
}

/// <summary>
/// In-memory loopback SOCKS5 relay for authenticated HTTP, HTTPS, and SOCKS5 upstream proxies
/// (SDK contract §8 and SI-06). Credentials never appear in engine process arguments or logs.
/// </summary>
internal sealed class LoopbackProxyRelay : IAsyncDisposable
{
    private const int DefaultHandshakeTimeoutMs = 15_000;
    private const int MaxHttpHeaderBytes = 32 * 1024;

    private readonly NormalizedProxy _upstream;
    private readonly byte[] _userBytes;
    private readonly byte[] _passBytes;
    private readonly string _basicAuth;
    private readonly ConcurrentDictionary<TcpClient, byte> _activeClients = new();

    private TcpListener? _listener;
    private CancellationTokenSource? _cts;
    private Task? _acceptLoop;
    private string? _url;

    internal int HandshakeTimeoutMs { get; set; } = DefaultHandshakeTimeoutMs;

    public string Url => _url ?? throw new ProxyException("Loopback proxy relay has not started.");

    public LoopbackProxyRelay(NormalizedProxy upstream)
    {
        _upstream = upstream;
        _userBytes = Encoding.UTF8.GetBytes(upstream.Username ?? string.Empty);
        _passBytes = Encoding.UTF8.GetBytes(upstream.Password ?? string.Empty);
        var combined = new byte[_userBytes.Length + 1 + _passBytes.Length];
        _userBytes.CopyTo(combined, 0);
        combined[_userBytes.Length] = (byte)':';
        _passBytes.CopyTo(combined, _userBytes.Length + 1);
        _basicAuth = Convert.ToBase64String(combined);
    }

    public Task<string> StartAsync()
    {
        if (_url is not null)
        {
            return Task.FromResult(_url);
        }

        try
        {
            var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            var port = ((IPEndPoint)listener.LocalEndpoint).Port;
            _listener = listener;
            _cts = new CancellationTokenSource();
            _url = $"socks5://127.0.0.1:{port}";
            _acceptLoop = Task.Run(() => AcceptLoopAsync(listener, _cts.Token));
            return Task.FromResult(_url);
        }
        catch (Exception ex)
        {
            throw new ProxyException(
                "Failed to start loopback proxy relay.",
                secrets: _upstream.Secrets(),
                innerException: ex);
        }
    }

    public async Task StopAsync()
    {
        var cts = Interlocked.Exchange(ref _cts, null);
        var listener = Interlocked.Exchange(ref _listener, null);
        var acceptLoop = Interlocked.Exchange(ref _acceptLoop, null);
        _url = null;

        if (cts is not null)
        {
            try
            {
                await cts.CancelAsync().ConfigureAwait(false);
            }
            catch (ObjectDisposedException)
            {
            }
        }

        try
        {
            listener?.Stop();
        }
        catch (SocketException)
        {
        }

        foreach (var client in _activeClients.Keys)
        {
            SafeClose(client);
        }

        _activeClients.Clear();

        if (acceptLoop is not null)
        {
            try
            {
                await acceptLoop.WaitAsync(TimeSpan.FromSeconds(5)).ConfigureAwait(false);
            }
            catch (Exception)
            {
            }
        }

        cts?.Dispose();
    }

    public ValueTask DisposeAsync() => new(StopAsync());

    private async Task AcceptLoopAsync(TcpListener listener, CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            TcpClient client;
            try
            {
                client = await listener.AcceptTcpClientAsync(ct).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (ObjectDisposedException)
            {
                break;
            }
            catch (SocketException)
            {
                break;
            }

            _ = Task.Run(() => HandleClientAsync(client, ct), CancellationToken.None);
        }
    }

    private async Task HandleClientAsync(TcpClient client, CancellationToken serverCt)
    {
        _activeClients.TryAdd(client, 0);
        TcpClient? upstreamClient = null;
        Stream? upstreamStream = null;

        try
        {
            if (client.Client.RemoteEndPoint is IPEndPoint remote && !IPAddress.IsLoopback(remote.Address))
            {
                return;
            }

            client.NoDelay = true;
            var clientStream = client.GetStream();

            using var handshakeCts = CancellationTokenSource.CreateLinkedTokenSource(serverCt);
            handshakeCts.CancelAfter(HandshakeTimeoutMs);
            var hct = handshakeCts.Token;

            // Local SOCKS5 greeting (no-auth required on loopback)
            var greet = await ReadExactAsync(clientStream, 2, hct).ConfigureAwait(false);
            if (greet[0] != 0x05)
            {
                return;
            }

            _ = await ReadExactAsync(clientStream, greet[1], hct).ConfigureAwait(false);
            await clientStream.WriteAsync(new byte[] { 0x05, 0x00 }, hct).ConfigureAwait(false);

            var reqHdr = await ReadExactAsync(clientStream, 4, hct).ConfigureAwait(false);
            var cmd = reqHdr[1];
            var atyp = reqHdr[3];

            string targetHost;
            byte[] rawAddrPayload;
            if (atyp == 1)
            {
                rawAddrPayload = await ReadExactAsync(clientStream, 4, hct).ConfigureAwait(false);
                targetHost = new IPAddress(rawAddrPayload).ToString();
            }
            else if (atyp == 3)
            {
                var lenBuf = await ReadExactAsync(clientStream, 1, hct).ConfigureAwait(false);
                var domainBuf = await ReadExactAsync(clientStream, lenBuf[0], hct).ConfigureAwait(false);
                rawAddrPayload = new byte[1 + domainBuf.Length];
                rawAddrPayload[0] = lenBuf[0];
                domainBuf.CopyTo(rawAddrPayload, 1);
                targetHost = Encoding.UTF8.GetString(domainBuf);
            }
            else if (atyp == 4)
            {
                rawAddrPayload = await ReadExactAsync(clientStream, 16, hct).ConfigureAwait(false);
                targetHost = $"[{new IPAddress(rawAddrPayload)}]";
            }
            else
            {
                await clientStream.WriteAsync(new byte[] { 0x05, 0x08, 0x00, 0x01, 0, 0, 0, 0, 0, 0 }, hct).ConfigureAwait(false);
                return;
            }

            var portBuf = await ReadExactAsync(clientStream, 2, hct).ConfigureAwait(false);
            var targetPort = BinaryPrimitives.ReadUInt16BigEndian(portBuf);

            if (cmd != 1) // CONNECT only
            {
                await clientStream.WriteAsync(new byte[] { 0x05, 0x07, 0x00, 0x01, 0, 0, 0, 0, 0, 0 }, hct).ConfigureAwait(false);
                return;
            }

            upstreamClient = new TcpClient { NoDelay = true };
            _activeClients.TryAdd(upstreamClient, 0);
            await upstreamClient.ConnectAsync(_upstream.Host, _upstream.Port, hct).ConfigureAwait(false);
            upstreamStream = upstreamClient.GetStream();

            if (_upstream.Scheme == "https")
            {
                var ssl = new SslStream(upstreamStream, leaveInnerStreamOpen: false);
                await ssl.AuthenticateAsClientAsync(
                    new SslClientAuthenticationOptions { TargetHost = _upstream.Host },
                    hct).ConfigureAwait(false);
                upstreamStream = ssl;
            }

            byte[]? initialUpstreamLeftover = null;
            bool upstreamOk;
            if (_upstream.Scheme is "socks5" or "socks5h")
            {
                upstreamOk = await Socks5UpstreamConnectAsync(upstreamStream, atyp, rawAddrPayload, portBuf, hct)
                    .ConfigureAwait(false);
            }
            else
            {
                (upstreamOk, initialUpstreamLeftover) = await HttpUpstreamConnectAsync(upstreamStream, targetHost, targetPort, hct)
                    .ConfigureAwait(false);
            }

            await clientStream.WriteAsync(
                new byte[] { 0x05, upstreamOk ? (byte)0x00 : (byte)0x05, 0x00, 0x01, 0, 0, 0, 0, 0, 0 },
                hct).ConfigureAwait(false);

            if (!upstreamOk)
            {
                return;
            }

            if (initialUpstreamLeftover is { Length: > 0 })
            {
                await clientStream.WriteAsync(initialUpstreamLeftover, serverCt).ConfigureAwait(false);
            }

            var c2u = PipeAsync(clientStream, upstreamStream, serverCt);
            var u2c = PipeAsync(upstreamStream, clientStream, serverCt);
            await Task.WhenAll(c2u, u2c).ConfigureAwait(false);
        }
        catch (Exception ex) when (ex is IOException or SocketException or OperationCanceledException or ObjectDisposedException)
        {
            // Normal socket closure, timeout, or relay shutdown.
        }
        catch (Exception ex)
        {
            // Never log credentials or upstream host details.
            OmbraLogger.Debug($"Proxy relay stream ended with {ex.GetType().Name}");
        }
        finally
        {
            if (upstreamStream is not null)
            {
                try
                {
                    await upstreamStream.DisposeAsync().ConfigureAwait(false);
                }
                catch (Exception)
                {
                }
            }

            if (upstreamClient is not null)
            {
                _activeClients.TryRemove(upstreamClient, out _);
                SafeClose(upstreamClient);
            }

            _activeClients.TryRemove(client, out _);
            SafeClose(client);
        }
    }

    private async Task<(bool Ok, byte[]? Leftover)> HttpUpstreamConnectAsync(
        Stream upstreamStream,
        string host,
        int port,
        CancellationToken ct)
    {
        var authLine = _upstream.HasCredentials
            ? $"Proxy-Authorization: Basic {_basicAuth}\r\n"
            : string.Empty;
        var req = $"CONNECT {host}:{port} HTTP/1.1\r\nHost: {host}:{port}\r\n{authLine}\r\n";
        await upstreamStream.WriteAsync(Encoding.ASCII.GetBytes(req), ct).ConfigureAwait(false);

        using var ms = new MemoryStream();
        var buf = new byte[1024];
        var headerEnd = -1;
        while (headerEnd == -1)
        {
            var read = await upstreamStream.ReadAsync(buf, ct).ConfigureAwait(false);
            if (read == 0)
            {
                return (false, null);
            }

            ms.Write(buf, 0, read);
            if (ms.Length > MaxHttpHeaderBytes)
            {
                return (false, null);
            }

            headerEnd = FindHeaderEnd(ms.GetBuffer(), (int)ms.Length);
        }

        return ParseHttpConnectResponse(ms.GetBuffer(), (int)ms.Length, headerEnd);
    }

    private static int FindHeaderEnd(byte[] buffer, int length) =>
        buffer.AsSpan(0, length).IndexOf("\r\n\r\n"u8);

    private static (bool Ok, byte[]? Leftover) ParseHttpConnectResponse(byte[] buffer, int length, int headerEnd)
    {
        var allBytes = buffer.AsSpan(0, length);
        var lineEnd = allBytes.IndexOf("\r\n"u8);
        var statusLine = Encoding.ASCII.GetString(lineEnd >= 0 ? allBytes[..lineEnd] : allBytes);
        var parts = statusLine.Split(' ');
        var ok = parts.Length >= 2 && parts[1] == "200";
        var bodyStart = headerEnd + 4;
        var leftover = bodyStart < allBytes.Length ? allBytes[bodyStart..].ToArray() : null;
        return (ok, leftover);
    }

    private async Task<bool> Socks5UpstreamConnectAsync(
        Stream upstreamStream,
        byte atyp,
        byte[] rawAddrPayload,
        byte[] portBuf,
        CancellationToken ct)
    {
        byte method = _upstream.HasCredentials ? (byte)0x02 : (byte)0x00;
        await upstreamStream.WriteAsync(new byte[] { 0x05, 0x01, method }, ct).ConfigureAwait(false);
        var chosen = await ReadExactAsync(upstreamStream, 2, ct).ConfigureAwait(false);
        if (chosen[0] != 0x05 || chosen[1] != method)
        {
            return false;
        }

        if (method == 0x02)
        {
            var authPkt = new byte[3 + _userBytes.Length + _passBytes.Length];
            authPkt[0] = 0x01;
            authPkt[1] = (byte)_userBytes.Length;
            _userBytes.CopyTo(authPkt, 2);
            authPkt[2 + _userBytes.Length] = (byte)_passBytes.Length;
            _passBytes.CopyTo(authPkt, 3 + _userBytes.Length);
            await upstreamStream.WriteAsync(authPkt, ct).ConfigureAwait(false);
            var authRes = await ReadExactAsync(upstreamStream, 2, ct).ConfigureAwait(false);
            if (authRes[0] != 0x01 || authRes[1] != 0x00)
            {
                return false;
            }
        }

        var connectPkt = new byte[4 + rawAddrPayload.Length + 2];
        connectPkt[0] = 0x05;
        connectPkt[1] = 0x01;
        connectPkt[2] = 0x00;
        connectPkt[3] = atyp;
        rawAddrPayload.CopyTo(connectPkt, 4);
        portBuf.CopyTo(connectPkt, 4 + rawAddrPayload.Length);
        await upstreamStream.WriteAsync(connectPkt, ct).ConfigureAwait(false);

        var repHdr = await ReadExactAsync(upstreamStream, 4, ct).ConfigureAwait(false);
        var bAtyp = repHdr[3];
        if (bAtyp == 1)
        {
            _ = await ReadExactAsync(upstreamStream, 4, ct).ConfigureAwait(false);
        }
        else if (bAtyp == 4)
        {
            _ = await ReadExactAsync(upstreamStream, 16, ct).ConfigureAwait(false);
        }
        else if (bAtyp == 3)
        {
            var bLen = (await ReadExactAsync(upstreamStream, 1, ct).ConfigureAwait(false))[0];
            _ = await ReadExactAsync(upstreamStream, bLen, ct).ConfigureAwait(false);
        }

        _ = await ReadExactAsync(upstreamStream, 2, ct).ConfigureAwait(false);
        return repHdr[1] == 0x00;
    }

    private static async Task<byte[]> ReadExactAsync(Stream stream, int count, CancellationToken ct)
    {
        var buf = new byte[count];
        var offset = 0;
        while (offset < count)
        {
            var read = await stream.ReadAsync(buf.AsMemory(offset, count - offset), ct).ConfigureAwait(false);
            if (read == 0)
            {
                throw new EndOfStreamException("Unexpected EOF during SOCKS5/HTTP proxy handshake.");
            }

            offset += read;
        }

        return buf;
    }

    private static async Task PipeAsync(Stream src, Stream dst, CancellationToken ct)
    {
        var buffer = new byte[64 * 1024];
        try
        {
            int read;
            while ((read = await src.ReadAsync(buffer, ct).ConfigureAwait(false)) > 0)
            {
                await dst.WriteAsync(buffer.AsMemory(0, read), ct).ConfigureAwait(false);
            }
        }
        catch (Exception ex) when (ex is IOException or SocketException or OperationCanceledException or ObjectDisposedException)
        {
        }
        finally
        {
            if (dst is NetworkStream ns)
            {
                try
                {
                    ns.Socket.Shutdown(SocketShutdown.Send);
                }
                catch (Exception)
                {
                }
            }
        }
    }

    private static void SafeClose(TcpClient client)
    {
        try
        {
            client.Dispose();
        }
        catch (Exception)
        {
        }
    }

    public static async Task<(IReadOnlyList<string> ProxyArgs, LoopbackProxyRelay? Relay)> PrepareAsync(
        NormalizedProxy? proxy)
    {
        if (proxy is null)
        {
            return ([], null);
        }

        LoopbackProxyRelay? relay = null;
        var flags = new List<string>(2);
        if (proxy.HasCredentials)
        {
            relay = new LoopbackProxyRelay(proxy);
            var relayUrl = await relay.StartAsync().ConfigureAwait(false);
            flags.Add($"--proxy-server={relayUrl}");
        }
        else
        {
            flags.Add($"--proxy-server={proxy.ServerUrl}");
        }

        if (!string.IsNullOrEmpty(proxy.Bypass))
        {
            flags.Add($"--proxy-bypass-list={proxy.Bypass}");
        }

        return (flags, relay);
    }
}
