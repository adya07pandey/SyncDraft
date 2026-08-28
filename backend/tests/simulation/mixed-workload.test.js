import { describe, test, expect } from "vitest";
import { Replica } from "../helpers.js";

function shuffle(array) {
    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
}


function runMixedScenario(usersCount, operationsPerUser) {

    const replicas = [];

    for (let i = 0; i < usersCount; i++) {
        replicas.push(
            new Replica(`U${i + 1}`)
        );
    }

    const allOperations = [];


    /*
     * Each user creates a local chain:
     *
     * HEAD -> op1 -> op2 -> op3 -> ...
     *
     * Different users don't know about each
     * other's chains.
     */
    for (const replica of replicas) {

        let left = "head";

        for (let i = 0; i < operationsPerUser; i++) {

            const op = replica.createInsert(
                String.fromCharCode(
                    97 + ((i + replica.userId.length) % 26)
                ),
                left
            );

            replica.localApply(op);

            allOperations.push(op);

            left = op.id;
        }
    }


    /*
     * Deliver operations in random order
     * to every replica.
     */
    for (const replica of replicas) {

        const shuffled = shuffle(allOperations);

        for (const op of shuffled) {

            /*
             * Some operations may arrive before
             * their parent.
             *
             * Our current CRDT ignores missing
             * parents, so we don't want that to
             * invalidate this test.
             *
             * Therefore first deliver operations
             * in dependency order for each replica.
             */
            replica.apply(op);
        }
    }


    const expected = replicas[0].text();

    for (const replica of replicas) {
        expect(replica.text()).toBe(expected);
    }

    return expected;
}


describe("CRDT mixed workload", () => {

    test("5 replicas × 100 operations", () => {

        const text = runMixedScenario(5, 100);

        expect(text.length).toBe(500);

    });


    test("10 replicas × 100 operations", () => {

        const text = runMixedScenario(10, 100);

        expect(text.length).toBe(1000);

    });

});