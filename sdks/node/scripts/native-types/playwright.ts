import { launch, launchContext, launchPersistentContext, type PlaywrightBrowserLike } from '@ombralabs/sdk';
import { chromium, type Browser, type BrowserContext, type Page } from 'CLIENT';
// The declared minimum client must expose the attach option we rely on.
void (() => chromium.connectOverCDP('http://127.0.0.1:9222', { noDefaults: true }));
declare function browserHelper(browser: Browser): void;
declare function contextHelper(context: BrowserContext): void;
declare function pageHelper(page: Page): void;
async function nativeHelpers() {
  const browser = await launch();
  browserHelper(browser);
  const page = await browser.newPage();
  pageHelper(page);
  // @ts-expect-error Native Browser must not be any or the legacy indexed Like type.
  browser.inventedMember;
  // @ts-expect-error Native Page must not be any.
  page.inventedMember;
  for (const context of [await launchContext(), await launchPersistentContext('profile')]) {
    contextHelper(context);
    const contextPage = await context.newPage();
    pageHelper(contextPage);
    // @ts-expect-error Native BrowserContext must not be any.
    context.inventedMember;
    // @ts-expect-error Native context Page must not be any.
    contextPage.inventedMember;
  }
  const legacy: PlaywrightBrowserLike = await launch<PlaywrightBrowserLike>();
  const custom: { custom: true } = await launch<{ custom: true }>();
  const customContext: { custom: true } = await launchContext<{ custom: true }>();
  const customPersistent: { custom: true } = await launchPersistentContext<{ custom: true }>('profile');
}
