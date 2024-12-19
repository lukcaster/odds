import {APIResponse, Page} from "playwright";
import {Sport} from "../utils/enums/sport";
import * as dotenv from 'dotenv';
dotenv.config();

export async function getOdds(page: Page, sport = Sport.NFL): Promise<APIResponse> {
    return await page.request.get(`https://api.the-odds-api.com/v4/sports/${sport.valueOf()}/odds/?apiKey=${process.env.apiKey}&regions=us&markets=h2h,spreads&oddsFormat=decimal`)
}