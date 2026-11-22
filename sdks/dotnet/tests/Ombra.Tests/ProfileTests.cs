using System.Text.Json;
using OmbraLabs.Ombra;
using Xunit;

namespace OmbraTests;

[Collection("OmbraEnv")]
public sealed class ProfileTests
{
    [Fact]
    public void PersistsSeedAcrossNamedProfileLaunchesAndUpdatesOnExplicitSeed()
    {
        using var env = new IsolatedEnv();

        long firstSeed;
        string dir1;
        using (var lease1 = ProfileStore.AcquireLease(
                   profile: "Shop Account",
                   osHint: "macos",
                   timezone: "America/New_York",
                   locale: "en-US"))
        {
            firstSeed = lease1.Seed;
            dir1 = lease1.Path;
            Assert.True(firstSeed >= 10_000);
        }

        using (var lease2 = ProfileStore.AcquireLease(profile: "Shop Account"))
        {
            Assert.Equal(dir1, lease2.Path);
            Assert.Equal(firstSeed, lease2.Seed);
            Assert.Equal("macos", lease2.OsHint);
            Assert.Equal("America/New_York", lease2.Timezone);
            Assert.Equal("en-US", lease2.Locale);
        }

        using (var lease3 = ProfileStore.AcquireLease(profile: "Shop Account", explicitSeed: 777_888))
        {
            Assert.Equal(777_888, lease3.Seed);
        }

        var meta = ProfileStore.ReadProfileMetadata(dir1);
        Assert.NotNull(meta);
        Assert.Equal(777_888, meta!.Seed);
    }

    [Fact]
    public void DisambiguatesSlugCollisionsAndReopensOwnedSuffixedProfileAfterNeighborDeletion()
    {
        using var env = new IsolatedEnv();

        string baseDir;
        using (var baseLease = ProfileStore.AcquireLease(profile: "Pricing EU", explicitSeed: 111))
        {
            baseDir = baseLease.Path;
        }

        string suffixedDir;
        using (var suffixed = ProfileStore.AcquireLease(profile: "Pricing!EU", explicitSeed: 222))
        {
            suffixedDir = suffixed.Path;
            File.WriteAllText(Path.Combine(suffixedDir, "cookies"), "persisted cookies");
        }

        Assert.NotEqual(baseDir, suffixedDir);
        Assert.Matches(@"^pricing-eu-[0-9a-f]{8}$", Path.GetFileName(suffixedDir));

        // Delete the base profile and verify "Pricing!EU" still resolves its own suffixed directory
        Directory.Delete(baseDir, recursive: true);

        using var reopened = ProfileStore.AcquireLease(profile: "Pricing!EU");
        Assert.Equal(suffixedDir, reopened.Path);
        Assert.Equal(222, reopened.Seed);
        Assert.Equal("persisted cookies", File.ReadAllText(Path.Combine(reopened.Path, "cookies")));
    }

    [Fact]
    public void RemovesEphemeralProfileDirectoryOnDispose()
    {
        using var env = new IsolatedEnv();
        string dir;
        using (var lease = ProfileStore.AcquireLease())
        {
            Assert.True(lease.Ephemeral);
            dir = lease.Path;
            Assert.True(Directory.Exists(dir));
        }

        Assert.False(Directory.Exists(dir));
    }

    [Fact]
    public void RejectsConcurrentSameProcessAcquisitionAndTruncatesLockOnRelease()
    {
        using var env = new IsolatedEnv();
        var userDataDir = Path.Combine(env.TmpRoot, "locked-profile");

        using (var first = ProfileStore.AcquireLease(userDataDir: userDataDir))
        {
            Assert.Throws<ProfileBusyException>(() =>
                ProfileStore.AcquireLease(userDataDir: userDataDir));
        }

        var lockFile = Path.Combine(userDataDir, ".ombra", "profile.lock");
        Assert.True(File.Exists(lockFile));
        Assert.Equal(string.Empty, File.ReadAllText(lockFile));

        using var second = ProfileStore.AcquireLease(userDataDir: userDataDir);
        Assert.Equal(userDataDir, second.Path);
    }

    [Fact]
    public void ReclaimsStaleLegacyPidAndPreservesLiveLegacyPid()
    {
        using var env = new IsolatedEnv();

        var staleDir = Path.Combine(env.TmpRoot, "stale-legacy");
        var staleLock = Path.Combine(staleDir, ".ombra", "profile.lock");
        Directory.CreateDirectory(Path.GetDirectoryName(staleLock)!);
        File.WriteAllText(staleLock, JsonSerializer.Serialize(new { pid = 999_999_991 }));

        using (var recovered = ProfileStore.AcquireLease(userDataDir: staleDir))
        {
            Assert.Equal(staleDir, recovered.Path);
        }

        var liveDir = Path.Combine(env.TmpRoot, "live-legacy");
        var liveLock = Path.Combine(liveDir, ".ombra", "profile.lock");
        Directory.CreateDirectory(Path.GetDirectoryName(liveLock)!);
        var payload = JsonSerializer.Serialize(new { pid = Environment.ProcessId });
        File.WriteAllText(liveLock, payload);

        Assert.Throws<ProfileBusyException>(() =>
            ProfileStore.AcquireLease(userDataDir: liveDir));
        Assert.Equal(payload, File.ReadAllText(liveLock));
    }
}
