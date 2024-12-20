import {Page} from "playwright";

export class Etoto {
    constructor(private page: Page) {
    }
    
    public async getHandicap(): Promise<void> {
        await this.page.goto('https://www.etoto.pl/')
        
        if (await this.page.getByRole("button", {name: "Zezwól na wszystkie"}).isVisible()) {
            await this.page.getByRole("button", {name: "Zezwól na wszystkie"}).click()
        }
        
        await this.page.getByText("Futbol amerykański").waitFor({state: "attached"})
        await this.page.getByText("Futbol amerykański").click()
        
        await this.page.getByText("USA").first().waitFor({state: "attached"})
        await this.page.getByText("USA").first().click()
        
        await this.page.getByText("NFL").first().waitFor({state: "attached"})
        await this.page.getByText("NFL").first().click()
        
        await this.page.locator(".single-event").first().waitFor({state: "attached"})
        await this.page.locator(".single-event").first().click()
        
        await this.page.getByRole("button").getByText("Handicap")
                  .waitFor({state: "attached"})
        await this.page.getByRole("button").getByText("Handicap").click();
        // const test = await this.page.locator(".single-event").all()
        //
        // for (let test2 of test) {
        //     console.log(await test2.innerHTML())
        // }
    }
}