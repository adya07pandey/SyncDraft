import { describe, test, expect } from "vitest";
import { Replica } from "../simulation/helpers.js";

function shuffle(array) {
    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
}

function runConcurrentSimulation(users, opsPerUser) {

    const replicas = [];

    for (let i = 0; i < users; i++) {
        replicas.push(new Replica(`U${i + 1}`));
    }

    const operations = [];

    const start = performance.now();

    /*
     * Every user inserts AFTER HEAD.
     * Therefore every operation is concurrent.
     */
    for (const replica of replicas) {

        for (let i = 0; i < opsPerUser; i++) {

            const op = replica.createInsert(
                String.fromCharCode(97 + (i % 26)),
                "head"
            );

            replica.localApply(op);

            operations.push(op);
        }
    }

    /*
     * Every replica receives the SAME operations
     * but in a DIFFERENT random order.
     */
    for (const replica of replicas) {

        const shuffled = shuffle(operations);

        for (const op of shuffled) {

            const owner = op.id.split("-")[0];

            if (owner !== replica.userId) {
                replica.apply(op);
            }
        }
    }

    const end = performance.now();

    const expected = replicas[0].text();

    let converged = true;

    for (const replica of replicas) {

        if (replica.text() !== expected) {
            converged = false;
            break;
        }
    }

    return {
        users,
        opsPerUser,
        totalOperations: operations.length,
        durationMs: +(end - start).toFixed(3),
        opsPerSecond: Math.round(
            operations.length / ((end - start) / 1000)
        ),
        finalLength: expected.length,
        converged
    };
}

describe("Concurrent CRDT metrics", () => {

    test("10 users × 100 concurrent operations", () => {

        const result = runConcurrentSimulation(10, 100);

        console.table(result);

        expect(result.converged).toBe(true);

    }, 30000);


    test("20 users × 100 concurrent operations", () => {

        const result = runConcurrentSimulation(20, 100);

        console.table(result);

        expect(result.converged).toBe(true);

    }, 30000);


    test("50 users × 50 concurrent operations", () => {

        const result = runConcurrentSimulation(50, 50);

        console.table(result);

        expect(result.converged).toBe(true);

    }, 30000);

});