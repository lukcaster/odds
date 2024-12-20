import {z} from "zod";

export const odsResponseParser = z.array(
    z.object({
    id: z.string(),
    sport_key: z.string(),
    sport_title: z.string(),
    commence_time: z.string(),
    home_team: z.string(),
    away_team: z.string(),
    bookmakers: z.array(z.object({
        key: z.string(),
        title: z.string(),
        last_update: z.string(),
        markets: z.array(z.object({
            key: z.string(), last_update: z.string(), outcomes: z.array(z.object({
                name: z.string(), price: z.number(), point: z.number()
            }))
        }))
    }))
}))

export type OdsResponse = z.infer<typeof odsResponseParser>