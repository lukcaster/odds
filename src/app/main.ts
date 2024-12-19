import {getOdds} from "./get-odds/get-us-nfl-odds";
import {setPage} from "./utils/set-page";

const start = async (): Promise<void> => {
    const page = await setPage();
    const response = await getOdds(page);
    console.log(await response.json())
}

start();