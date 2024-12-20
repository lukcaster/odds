import {Page} from "playwright";
import {setPage} from "../utils/set-page";
import {getOdds} from "./get-us-nfl-odds";
import {OdsResponse, odsResponseParser} from "../utils/ods-response-parser";
import {Outcome} from "../utils/outcome";
import {Etoto} from "../crawl-odds/etoto";

export class OmegaCalculator {
    private page!: Page;
    
    public async calculate(): Promise<void> {
        this.page = await setPage();
        // const response = await getOdds(this.page);
        // const parsedResponse = odsResponseParser.parse(await response.json());
        // const outcomes = this.getOutcomes(parsedResponse);
        
        // this.logOutcomes(outcomes)
        const crawlers = new Etoto(this.page);
        await crawlers.getHandicap();
    }
    
    private getOutcomes(ods: OdsResponse): Outcome[] {
        const outcomes: Outcome[] = [];
        for (let outcome of ods) {
            outcomes.push(new Outcome(outcome.home_team, outcome.away_team, outcome.bookmakers[0].markets[0].outcomes[0].name, outcome.bookmakers[0].markets[0].outcomes[0].price, outcome.bookmakers[0].markets[0].outcomes[0].point))
        }
        return outcomes
    }
    
    private logOutcomes(outcomes: Outcome[]): void {
        for (let outcome of outcomes) {
            console.log(outcome)
        }
    }
}