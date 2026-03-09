import * as dotenv from 'dotenv';
import { APIResponse, Page } from "playwright";
import { Sport } from "../utils/enums/sport";

dotenv.config();

export async function getOdds(page: Page, sport = Sport.NFL): Promise<APIResponse> {
    const apiKey = process.env.apiKey;

    if (!apiKey) {
        throw new Error('Brakuje API key! Ustaw zmienną środowiskową apiKey w pliku .env');
    }

    const url = `https://api.the-odds-api.com/v4/sports/${sport.valueOf()}/odds/?apiKey=${apiKey}&regions=us&markets=spreads&oddsFormat=decimal`;

    const response = await page.request.get(url);

    if (!response.ok()) {
        throw new Error(`API error: ${response.status()} ${response.statusText()}`);
    }

    return response;
}