using System.Buffers.Binary;
using System.Net;
using System.Net.Sockets;
using System.Text;
using OmbraLabs.Ombra;
using Xunit;

namespace OmbraTests;

public sealed class ProxyTests
{
    [Fact]
    public void ParsesStringContractObjectPlaywrightObjectAndPercentEncodedUtf8()
    {
        var p1 = ProxyParser.Parse("proxy.example.com:8080")!;
        Assert.Equal("http", p1.Scheme);
        Assert.Equal("http://proxy.example.com:8080", p1.ServerUrl);
        Assert.False(p1.HasCredentials);

        var p2 = ProxyParser.Parse("socks5h://%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7:%E5%AF%86%E7%A0%81%F0%9F%94%91@[::1]:1080")!;
        Assert.Equal("socks5", p2.Scheme);
        Assert.Equal("::1", p2.Host);
        Assert.Equal(1080, p2.Port);
        Assert.Equal("польз", p2.Username);
        Assert.Equal("密码🔑", p2.Password);
        Assert.True(p2.HasCredentials);
        Assert.Equal("socks5://[::1]:1080", p2.ServerUrl);

        var p3 = ProxyParser.Parse(new ProxyOption
        {
            Type = "https",
            Host = "gw.proxy.io",
            Port = 8443,
            Username = "u1",
            Password = "p1",
            Bypass = "*.local",
        })!;
        Assert.Equal("https://gw.proxy.io:8443", p3.ServerUrl);
        Assert.Equal("*.local", p3.Bypass);

        var p4 = ProxyParser.Parse(new ProxyOption
        {
            Server = "http://127.0.0.1:3128",
            Username = "pwuser",
            Password = "pwpass",
        })!;
        Assert.True(p4.HasCredentials);
        Assert.Equal("pwuser", p4.Username);

        Assert.Throws<InvalidOptionException>(() => ProxyParser.Parse("ftp://1.2.3.4:21"));
        Assert.Throws<ProxyException>(() => ProxyParser.Parse("http://bad-port:99999"));
        Assert.Throws<ProxyException>(() => ProxyParser.Parse($"socks5://{new string('u', 260)}:p@127.0.0.1:1080"));
    }

    [Fact]
    public async Task PassesUnauthenticatedProxyDirectlyWithoutRelay()
    {
        var parsed = ProxyParser.Parse(new ProxyOption
        {
            Type = "http",
            Host = "127.0.0.1",
            Port = 8080,
            Bypass = "localhost",
        });
        var (args, relay) = await LoopbackProxyRelay.PrepareAsync(parsed);
        Assert.Null(relay);
        Assert.Equal(["--proxy-server=http://127.0.0.1:8080", "--proxy-bypass-list=localhost"], args);
    }

    [Fact]
    public async Task TunnelsThroughAuthenticatedHttpConnectProxyWithoutLeakingCredentials()
    {
        using var echoServer = new TcpListener(IPAddress.Loopback, 0);
        echoServer.Start();
        var echoPort = ((IPEndPoint)echoServer.LocalEndpoint).Port;
        var echoTask = Task.Run(async () =>
        {
            using var client = await echoServer.AcceptTcpClientAsync();
            await using var s = client.GetStream();
            var buf = new byte[64];
            var n = await s.ReadAsync(buf);
            var reply = Encoding.UTF8.GetBytes("HTTP-OK:" + Encoding.UTF8.GetString(buf, 0, n));
            await s.WriteAsync(reply);
        });

        string? receivedAuth = null;
        using var upstreamProxy = new TcpListener(IPAddress.Loopback, 0);
        upstreamProxy.Start();
        var proxyPort = ((IPEndPoint)upstreamProxy.LocalEndpoint).Port;
        var proxyTask = Task.Run(async () =>
        {
            using var client = await upstreamProxy.AcceptTcpClientAsync();
            await using var clientStream = client.GetStream();
            var head = await ReadUntilAsync(clientStream, "\r\n\r\n"u8.ToArray());
            var headerText = Encoding.ASCII.GetString(head);
            receivedAuth = headerText.Split("\r\n")
                .FirstOrDefault(l => l.StartsWith("Proxy-Authorization:", StringComparison.OrdinalIgnoreCase));

            using var target = new TcpClient();
            await target.ConnectAsync(IPAddress.Loopback, echoPort);
            await using var targetStream = target.GetStream();
            await clientStream.WriteAsync("HTTP/1.1 200 Connection Established\r\n\r\n"u8.ToArray());

            var t1 = clientStream.CopyToAsync(targetStream);
            var t2 = targetStream.CopyToAsync(clientStream);
            await Task.WhenAny(t1, t2);
        });

        var parsed = ProxyParser.Parse(
            $"http://%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7:%E5%AF%86%E7%A0%81%F0%9F%94%91@127.0.0.1:{proxyPort}")!;
        var (proxyArgs, relay) = await LoopbackProxyRelay.PrepareAsync(parsed);
        Assert.NotNull(relay);
        Assert.StartsWith("--proxy-server=socks5://127.0.0.1:", proxyArgs[0]);
        Assert.DoesNotContain("польз", proxyArgs[0]);
        Assert.DoesNotContain("密码🔑", proxyArgs[0]);

        try
        {
            var relayPort = new Uri(relay!.Url).Port;
            var reply = await Socks5HandshakeAndEchoAsync(relayPort, "127.0.0.1", echoPort, "ping");
            Assert.Equal("HTTP-OK:ping", reply);
            var expectedB64 = Convert.ToBase64String(Encoding.UTF8.GetBytes("польз:密码🔑"));
            Assert.Equal($"Proxy-Authorization: Basic {expectedB64}", receivedAuth);
        }
        finally
        {
            await relay!.StopAsync();
            upstreamProxy.Stop();
            echoServer.Stop();
            await Task.WhenAny(Task.WhenAll(echoTask, proxyTask), Task.Delay(1000));
        }
    }

    [Fact]
    public async Task TunnelsThroughAuthenticatedSocks5UpstreamAndEnforcesHandshakeTimeout()
    {
        using var echoServer = new TcpListener(IPAddress.Loopback, 0);
        echoServer.Start();
        var echoPort = ((IPEndPoint)echoServer.LocalEndpoint).Port;
        var echoTask = Task.Run(async () =>
        {
            using var client = await echoServer.AcceptTcpClientAsync();
            await using var s = client.GetStream();
            var buf = new byte[64];
            var n = await s.ReadAsync(buf);
            var reply = Encoding.UTF8.GetBytes("SOCKS5-OK:" + Encoding.UTF8.GetString(buf, 0, n));
            await s.WriteAsync(reply);
        });

        string? seenCreds = null;
        using var upstreamSocks = new TcpListener(IPAddress.Loopback, 0);
        upstreamSocks.Start();
        var socksPort = ((IPEndPoint)upstreamSocks.LocalEndpoint).Port;
        var socksTask = Task.Run(async () =>
        {
            using var client = await upstreamSocks.AcceptTcpClientAsync();
            await using var s = client.GetStream();
            var greet = await ReadExactAsync(s, 3);
            Assert.Equal(0x05, greet[0]);
            Assert.Equal(0x02, greet[2]);
            await s.WriteAsync(new byte[] { 0x05, 0x02 });

            var authHdr = await ReadExactAsync(s, 2);
            var user = Encoding.UTF8.GetString(await ReadExactAsync(s, authHdr[1]));
            var passLen = (await ReadExactAsync(s, 1))[0];
            var pass = Encoding.UTF8.GetString(await ReadExactAsync(s, passLen));
            seenCreds = $"{user}:{pass}";
            await s.WriteAsync(new byte[] { 0x01, 0x00 });

            var req = await ReadExactAsync(s, 4);
            if (req[3] == 3)
            {
                var dLen = (await ReadExactAsync(s, 1))[0];
                _ = await ReadExactAsync(s, dLen);
            }
            else if (req[3] == 1)
            {
                _ = await ReadExactAsync(s, 4);
            }

            _ = await ReadExactAsync(s, 2);

            using var target = new TcpClient();
            await target.ConnectAsync(IPAddress.Loopback, echoPort);
            await using var targetStream = target.GetStream();
            await s.WriteAsync(new byte[] { 0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 0 });

            var t1 = s.CopyToAsync(targetStream);
            var t2 = targetStream.CopyToAsync(s);
            await Task.WhenAny(t1, t2);
        });

        var relay = new LoopbackProxyRelay(ProxyParser.Parse(
            $"socks5h://%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7:%E5%AF%86%E7%A0%81%F0%9F%94%91@127.0.0.1:{socksPort}")!);
        await relay.StartAsync();

        try
        {
            var relayPort = new Uri(relay.Url).Port;
            var reply = await Socks5HandshakeAndEchoAsync(relayPort, "127.0.0.1", echoPort, "hello");
            Assert.Equal("SOCKS5-OK:hello", reply);
            Assert.Equal("польз:密码🔑", seenCreds);

            // Handshake timeout closes stalled client cleanly
            relay.HandshakeTimeoutMs = 100;
            using var stalled = new TcpClient();
            await stalled.ConnectAsync(IPAddress.Loopback, relayPort);
            var buf = new byte[16];
            var readTask = stalled.GetStream().ReadAsync(buf).AsTask();
            var completed = await Task.WhenAny(readTask, Task.Delay(2000));
            Assert.Same(readTask, completed);
            Assert.Equal(0, await readTask);
        }
        finally
        {
            await relay.StopAsync();
            upstreamSocks.Stop();
            echoServer.Stop();
            await Task.WhenAny(Task.WhenAll(echoTask, socksTask), Task.Delay(1000));
        }
    }

    private static async Task<string> Socks5HandshakeAndEchoAsync(
        int relayPort,
        string targetHost,
        int targetPort,
        string payload)
    {
        using var client = new TcpClient();
        await client.ConnectAsync(IPAddress.Loopback, relayPort);
        await using var s = client.GetStream();

        await s.WriteAsync(new byte[] { 0x05, 0x01, 0x00 });
        var greet = await ReadExactAsync(s, 2);
        Assert.Equal([0x05, 0x00], greet);

        var hostBytes = Encoding.UTF8.GetBytes(targetHost);
        var req = new byte[5 + hostBytes.Length + 2];
        req[0] = 0x05;
        req[1] = 0x01;
        req[2] = 0x00;
        req[3] = 0x03;
        req[4] = (byte)hostBytes.Length;
        hostBytes.CopyTo(req, 5);
        BinaryPrimitives.WriteUInt16BigEndian(req.AsSpan(5 + hostBytes.Length, 2), (ushort)targetPort);
        await s.WriteAsync(req);

        var rep = await ReadExactAsync(s, 10);
        Assert.Equal(0x00, rep[1]);

        await s.WriteAsync(Encoding.UTF8.GetBytes(payload));
        var buf = new byte[128];
        var n = await s.ReadAsync(buf);
        return Encoding.UTF8.GetString(buf, 0, n);
    }

    private static async Task<byte[]> ReadExactAsync(Stream s, int count)
    {
        var buf = new byte[count];
        var offset = 0;
        while (offset < count)
        {
            var n = await s.ReadAsync(buf.AsMemory(offset, count - offset));
            if (n == 0)
            {
                throw new EndOfStreamException();
            }

            offset += n;
        }

        return buf;
    }

    private static async Task<byte[]> ReadUntilAsync(Stream s, byte[] marker)
    {
        using var ms = new MemoryStream();
        var buf = new byte[256];
        while (true)
        {
            var n = await s.ReadAsync(buf);
            if (n == 0)
            {
                throw new EndOfStreamException();
            }

            ms.Write(buf, 0, n);
            if (ContainsMarker(ms.GetBuffer(), (int)ms.Length, marker))
            {
                return ms.ToArray();
            }
        }
    }

    private static bool ContainsMarker(byte[] buffer, int length, byte[] marker) =>
        buffer.AsSpan(0, length).IndexOf(marker) >= 0;
}
