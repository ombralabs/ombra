using System.Text.Json;
using Microsoft.Playwright;
using OmbraLabs.Ombra;
using Xunit;

namespace OmbraTests;

public sealed class CdpTests
{
    [Fact]
    public async Task AttachesWithoutEnableCommandsAndExecutesHumanizeAndAgentCommands()
    {
        var harness = new FakePlaywrightHarness();
        var (session, state) = FakeCdpSessionProxy.Create();
        var browser = FakePlaywrightHarness.FakeBrowserProxy.Create(harness);

        await using var cdp = new OmbraCdp(browser, session);
        Assert.Empty(state.Calls);

        var initial = await cdp.GetHumanizeStateAsync();
        Assert.True(initial.Enabled);
        Assert.Equal("default", initial.Preset);

        var updated = await cdp.SetHumanizeAsync(new SetHumanizeOptions
        {
            Enabled = true,
            Preset = "careful",
            Overrides = new Dictionary<string, object?> { ["jitterPx"] = 2 },
        });
        Assert.Equal("careful", updated.Preset);

        await Assert.ThrowsAsync<InvalidOptionException>(() =>
            cdp.SetHumanizeAsync(new SetHumanizeOptions { Preset = "invalid" }));

        var agent = await cdp.AgentRunTaskAsync(new AgentRunTaskOptions
        {
            TargetId = "target-1",
            Goal = "Click submit",
            MaxSteps = 5,
            Model = "gemini-2.5-flash",
        });
        Assert.True(agent.Success);
        Assert.Equal("Task completed", agent.FinalText);

        await Assert.ThrowsAsync<InvalidOptionException>(() =>
            cdp.AgentRunTaskAsync(new AgentRunTaskOptions { TargetId = "", Goal = "x" }));
        await Assert.ThrowsAsync<InvalidOptionException>(() =>
            cdp.AgentRunTaskAsync(new AgentRunTaskOptions { TargetId = "t", Goal = "x", MaxSteps = 0 }));

        await cdp.DetachAsync();
        Assert.True(state.Detached);
    }

    [Fact]
    public async Task SubscribesAndUnsubscribesEventsAndRejectsInvalidHandles()
    {
        var (session, state) = FakeCdpSessionProxy.Create();
        var harness = new FakePlaywrightHarness();
        var browser = FakePlaywrightHarness.FakeBrowserProxy.Create(harness);
        await using var cdp = new OmbraCdp(browser, session);

        var received = new List<string>();
        var sub = cdp.On("Target.targetCreated", payload =>
        {
            received.Add(payload?.GetProperty("targetId").GetString() ?? string.Empty);
        });

        state.Emit("Target.targetCreated", new { targetId = "first" });
        sub.Dispose();
        sub.Dispose();
        state.Emit("Target.targetCreated", new { targetId = "second" });
        Assert.Equal(["first"], received);

        Assert.Equal("Ombra.humanizeDone", OmbraCdp.NormalizeEventName("humanizeDone"));
        Assert.Equal("Target.targetCreated", OmbraCdp.NormalizeEventName("Target.targetCreated"));
        Assert.Throws<InvalidOptionException>(() => OmbraCdp.NormalizeEventName(""));
        Assert.Throws<InvalidOptionException>(() => OmbraCdp.NormalizeEventName("Ombra."));

        await Assert.ThrowsAsync<InvalidOptionException>(() => Ombra.CdpAsync(new object()));
    }
}
