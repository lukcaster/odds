
export class Outcome {
    constructor(
        private home_team: string,
        private away_team: string,
        private name: string,
        private price: number,
        private point: number
    ) { }

    public getHomeTeam(): string {
        return this.home_team;
    }

    public getAwayTeam(): string {
        return this.away_team;
    }

    public getName(): string {
        return this.name;
    }

    public getPrice(): number {
        return this.price;
    }

    public getPoint(): number {
        return this.point;
    }
}