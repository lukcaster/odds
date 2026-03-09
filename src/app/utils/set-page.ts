import { chromium, Page } from "playwright";

export async function setPage(headless: boolean = true): Promise<Page> {
    const browser = await chromium.launch({
        headless: headless
    });
    const context = await browser.newContext();
    return await context.newPage();
}