"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.odsResponseParser = void 0;
var zod_1 = require("zod");
exports.odsResponseParser = zod_1.z.array(zod_1.z.object({
    id: zod_1.z.string(),
    sport_key: zod_1.z.string(),
    sport_title: zod_1.z.string(),
    commence_time: zod_1.z.string(),
    home_team: zod_1.z.string(),
    away_team: zod_1.z.string(),
    bookmakers: zod_1.z.array(zod_1.z.object({
        key: zod_1.z.string(),
        title: zod_1.z.string(),
        last_update: zod_1.z.string(),
        markets: zod_1.z.array(zod_1.z.object({
            key: zod_1.z.string(), last_update: zod_1.z.string(), outcomes: zod_1.z.array(zod_1.z.object({
                name: zod_1.z.string(), price: zod_1.z.number(), point: zod_1.z.number()
            }))
        }))
    }))
}));
