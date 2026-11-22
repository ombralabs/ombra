using System.Reflection;
using System.Runtime.ExceptionServices;
using Microsoft.Playwright;

namespace OmbraLabs.Ombra;

/// <summary>
/// Forward-compatible transparent <see cref="IBrowser"/> proxy using <see cref="DispatchProxy"/>.
/// Delegates every <see cref="IBrowser"/> member to the native Playwright instance while ensuring
/// <c>CloseAsync</c>/<c>DisposeAsync</c> cleanly tear down the Ombra engine and <c>NewContextAsync</c>/
/// <c>NewPageAsync</c> default to <see cref="ViewportSize.NoViewport"/> (SI-04).
/// </summary>
internal class OmbraBrowserProxy : DispatchProxy
{
    private IBrowser _inner = null!;
    private Func<BrowserCloseOptions?, Task> _closeHandler = null!;

    public static IBrowser Create(IBrowser inner, Func<BrowserCloseOptions?, Task> closeHandler)
    {
        var proxy = Create<IBrowser, OmbraBrowserProxy>();
        var impl = (OmbraBrowserProxy)(object)proxy;
        impl._inner = inner;
        impl._closeHandler = closeHandler;
        return proxy;
    }

    protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
    {
        if (targetMethod is null)
        {
            return null;
        }

        switch (targetMethod.Name)
        {
            case nameof(IBrowser.CloseAsync):
                var closeOpts = args is { Length: > 0 } ? args[0] as BrowserCloseOptions : null;
                return _closeHandler(closeOpts);

            case nameof(IAsyncDisposable.DisposeAsync):
                return new ValueTask(_closeHandler(null));

            case nameof(IBrowser.NewContextAsync):
                var ctxOpts = args is { Length: > 0 } ? args[0] as BrowserNewContextOptions : null;
                var effectiveCtxOpts = ctxOpts is null
                    ? new BrowserNewContextOptions { ViewportSize = ViewportSize.NoViewport }
                    : ctxOpts.ViewportSize is null
                        ? new BrowserNewContextOptions(ctxOpts) { ViewportSize = ViewportSize.NoViewport }
                        : ctxOpts;
                return _inner.NewContextAsync(effectiveCtxOpts);

            case nameof(IBrowser.NewPageAsync):
                var pageOpts = args is { Length: > 0 } ? args[0] as BrowserNewPageOptions : null;
                var effectivePageOpts = pageOpts is null
                    ? new BrowserNewPageOptions { ViewportSize = ViewportSize.NoViewport }
                    : pageOpts.ViewportSize is null
                        ? new BrowserNewPageOptions(pageOpts) { ViewportSize = ViewportSize.NoViewport }
                        : pageOpts;
                return _inner.NewPageAsync(effectivePageOpts);
        }

        try
        {
            return targetMethod.Invoke(_inner, args);
        }
        catch (TargetInvocationException tie) when (tie.InnerException is not null)
        {
            ExceptionDispatchInfo.Capture(tie.InnerException).Throw();
            throw;
        }
    }
}

/// <summary>
/// Forward-compatible transparent <see cref="IBrowserContext"/> proxy ensuring
/// <c>CloseAsync</c>/<c>DisposeAsync</c> also close the underlying browser and engine process.
/// </summary>
internal class OmbraBrowserContextProxy : DispatchProxy
{
    private IBrowserContext _inner = null!;
    private IBrowser _browser = null!;
    private bool _closeInnerContextFirst;

    public static IBrowserContext Create(IBrowserContext inner, IBrowser browser, bool closeInnerContextFirst)
    {
        var proxy = Create<IBrowserContext, OmbraBrowserContextProxy>();
        var impl = (OmbraBrowserContextProxy)(object)proxy;
        impl._inner = inner;
        impl._browser = browser;
        impl._closeInnerContextFirst = closeInnerContextFirst;
        return proxy;
    }

    protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
    {
        if (targetMethod is null)
        {
            return null;
        }

        switch (targetMethod.Name)
        {
            case nameof(IBrowserContext.CloseAsync):
                var closeOpts = args is { Length: > 0 } ? args[0] as BrowserContextCloseOptions : null;
                return CloseWithBrowserAsync(closeOpts);

            case nameof(IAsyncDisposable.DisposeAsync):
                return new ValueTask(CloseWithBrowserAsync(null));
        }

        try
        {
            return targetMethod.Invoke(_inner, args);
        }
        catch (TargetInvocationException tie) when (tie.InnerException is not null)
        {
            ExceptionDispatchInfo.Capture(tie.InnerException).Throw();
            throw;
        }
    }

    private async Task CloseWithBrowserAsync(BrowserContextCloseOptions? options)
    {
        try
        {
            if (_closeInnerContextFirst)
            {
                try
                {
                    await _inner.CloseAsync(options).ConfigureAwait(false);
                }
                catch (Exception)
                {
                    // Proceed to close browser and terminate engine.
                }
            }
        }
        finally
        {
            var browserOpts = options?.Reason is not null
                ? new BrowserCloseOptions { Reason = options.Reason }
                : null;
            await _browser.CloseAsync(browserOpts).ConfigureAwait(false);
        }
    }
}
