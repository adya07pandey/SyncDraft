import { describe, bench } from "vitest";
import { Replica } from "../simulation/helpers.js";

function shuffle(array) {

    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
}

function runSimulation(users = 5, operationsPerUser = 100) {

    const replicas = [];

    for (let i = 0; i < users; i++) {

        replicas.push(
            new Replica(`U${i + 1}`)
        );
    }

    const operations = [];

    for (const replica of replicas) {

        let left = "head";

        for (let i = 0; i < operationsPerUser; i++) {

            const op = replica.createInsert(
                String.fromCharCode(97 + (i % 26)),
                left
            );

            replica.localApply(op);

            operations.push(op);

            left = op.id;
        }
    }

    /*
     * Every replica receives the same operations,
     * but in a different random order.
     */

    for (const replica of replicas) {

        const shuffled = shuffle(operations);

        for (const op of shuffled) {

            replica.apply(op);
        }
    }

    const finalText = replicas[0].text();

    for (const replica of replicas) {

        if (replica.text() !== finalText) {

            throw new Error(
                "CONVERGENCE FAILURE"
            );
        }
    }

    return finalText;
}

describe("CRDT convergence benchmark", () => {

    bench("5 replicas × 100 operations", () => {

        runSimulation(5, 100);

    });

    bench("10 replicas × 100 operations", () => {

        runSimulation(10, 100);

    });

    bench("10 replicas × 500 operations", () => {

        runSimulation(10, 500);

    });

});