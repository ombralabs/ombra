import { launch, type LaunchOptions, type PlaywrightBrowserLike } from '@ombralabs/sdk';
import { launch as launchPuppeteer, type PuppeteerBrowserLike } from '@ombralabs/sdk/puppeteer';
import { ombraCdp } from '@ombralabs/sdk/cdp';
import { CaptchaEventRecorder } from '@ombralabs/sdk/captcha';
const options: LaunchOptions = { headless: true };
const custom: Promise<{ custom: true }> = launch<{ custom: true }>(options);
const legacy: Promise<PlaywrightBrowserLike> = launch<PlaywrightBrowserLike>(options);
const puppeteer: Promise<PuppeteerBrowserLike> = launchPuppeteer<PuppeteerBrowserLike>(options);
async function missingClientDefaults() {
  const browser = await launch();
  const pup = await launchPuppeteer();
  // @ts-expect-error Without a selected peer the default is unknown, never any.
  browser.newPage();
  // @ts-expect-error Without a selected peer the default is unknown, never any.
  pup.newPage();
}
