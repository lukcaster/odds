import {OmegaCalculator} from "./get-odds/omega-calculator";
const calculator = new OmegaCalculator();

const start = async (): Promise<void> => {
    await calculator.calculate();
}

start();