
export class Outcome {
    constructor(private home_team: string, private away_team: string, private name: string, private price: number, private point: number) {
        this.home_team = home_team;
        this.away_team = away_team;
        this.name = name;
        this.price = price;
        this.point = point;
    }
    
    public getOutcome(): Outcome {
        return  this;
    }
}