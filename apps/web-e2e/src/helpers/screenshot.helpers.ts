import { Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export interface ScreenshotOptions {
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  animations?: 'disabled' | 'allow';
}

export interface ScreenshotMetadata {
  path: string;
  category: string;
  pageName: string;
  state: string;
  viewport: string;
  timestamp: string;
}

export class ScreenshotHelper {
  private metadata: ScreenshotMetadata[] = [];

  constructor(
    private page: Page,
    private baseDir: string = 'screenshots'
  ) {}

  async capture(
    category: string,
    pageName: string,
    state: string,
    viewport: string = 'desktop',
    options?: ScreenshotOptions
  ): Promise<ScreenshotMetadata> {
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${viewport}-${state}-${timestamp}.png`;
    const dirPath = path.join(this.baseDir, category, pageName);
    const filePath = path.join(dirPath, fileName);

    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Disable animations if requested
    if (options?.animations === 'disabled') {
      await this.page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
        `,
      });
    }

    await this.page.screenshot({
      path: filePath,
      fullPage: options?.fullPage ?? true,
      clip: options?.clip,
    });

    const metadata: ScreenshotMetadata = {
      path: filePath,
      category,
      pageName,
      state,
      viewport,
      timestamp,
    };

    this.metadata.push(metadata);
    console.log(`📸 Screenshot saved: ${filePath}`);

    return metadata;
  }

  async captureElement(
    selector: string,
    category: string,
    pageName: string,
    state: string,
    viewport: string = 'desktop'
  ): Promise<ScreenshotMetadata> {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();

    if (!box) {
      throw new Error(`Element not found: ${selector}`);
    }

    return this.capture(category, pageName, `${state}-element`, viewport, {
      fullPage: false,
      clip: box,
    });
  }

  async captureHoverState(
    selector: string,
    category: string,
    pageName: string,
    elementName: string,
    viewport: string = 'desktop'
  ): Promise<ScreenshotMetadata> {
    const element = this.page.locator(selector);
    await element.hover();
    await this.page.waitForTimeout(300); // Wait for transition

    return this.captureElement(
      selector,
      category,
      pageName,
      `hover-${elementName}`,
      viewport
    );
  }

  async captureFocusState(
    selector: string,
    category: string,
    pageName: string,
    elementName: string,
    viewport: string = 'desktop'
  ): Promise<ScreenshotMetadata> {
    await this.page.locator(selector).focus();
    await this.page.waitForTimeout(100);

    return this.capture(category, pageName, `focus-${elementName}`, viewport);
  }

  async captureResponsive(
    category: string,
    pageName: string,
    state: string = 'default'
  ): Promise<ScreenshotMetadata[]> {
    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'laptop', width: 1366, height: 768 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 },
    ];

    const screenshots: ScreenshotMetadata[] = [];

    for (const viewport of viewports) {
      await this.page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await this.page.waitForTimeout(500);

      const screenshot = await this.capture(
        category,
        pageName,
        state,
        viewport.name
      );
      screenshots.push(screenshot);
    }

    return screenshots;
  }

  getMetadata(): ScreenshotMetadata[] {
    return this.metadata;
  }

  saveMetadata(outputPath: string): void {
    const data = JSON.stringify(this.metadata, null, 2);
    fs.writeFileSync(outputPath, data);
    console.log(`💾 Metadata saved: ${outputPath}`);
  }
}
