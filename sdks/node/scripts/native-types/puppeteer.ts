import { launch, type PuppeteerBrowserLike } from '@ombralabs/sdk/puppeteer';
import { launchPuppeteer } from '@ombralabs/sdk';
import type { Browser, Page } from 'CLIENT' with { 'resolution-mode': 'import' };
declare function browserHelper(browser: Browser): void;
declare function pageHelper(page: Page): void;
async function nativeHelpers() {
  for (const browser of [await launch(), await launchPuppeteer()]) {
    browserHelper(browser);
    const page = await browser.newPage();
    pageHelper(page);
    // @ts-expect-error Native Browser must not be any or the legacy indexed Like type.
    browser.inventedMember;
    // @ts-expect-error Native Page must not be any.
    page.inventedMember;
  }
  const legacy: PuppeteerBrowserLike = await launch<PuppeteerBrowserLike>();
  const custom: { custom: true } = await launch<{ custom: true }>();
}
