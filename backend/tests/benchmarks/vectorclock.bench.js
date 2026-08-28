import { describe, bench } from "vitest";
import VectorClock from "../../src/crdt/VectorClock.js";

function makeClock(userCount, base) {

    const clock = {};

    for (let i = 0; i < userCount; i++) {

        clock[`U${i}`] = base + i;
    }

    return clock;
}

describe("Vector clock performance", () => {

    bench("compare 10-user vector clocks", () => {

        const a = makeClock(10, 1);
        const b = makeClock(10, 2);

        VectorClock.compare(a, b);
    });

    bench("compare 100-user vector clocks", () => {

        const a = makeClock(100, 1);
        const b = makeClock(100, 2);

        VectorClock.compare(a, b);
    });

    bench("compare 1,000-user vector clocks", () => {

        const a = makeClock(1000, 1);
        const b = makeClock(1000, 2);

        VectorClock.compare(a, b);
    });

});