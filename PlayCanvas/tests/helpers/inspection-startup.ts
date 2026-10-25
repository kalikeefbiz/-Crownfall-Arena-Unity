import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Navigation completion does not await the deferred game module. Keep the
// established expectation timeout; only wait for the existing inspection API,
// not for models, countdown, scenery or any gameplay condition under test.
export async function waitForInspection(page: Page) {
    await expect.poll(() => page.evaluate(() => Object.hasOwn(window, '__crownfall'))).toBe(true);
}
