import {chromium, Page} from "playwright";

export async function setPage(): Promise<Page> {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    return  await context.newPage();
}