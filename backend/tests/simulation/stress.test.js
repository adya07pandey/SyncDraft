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


/*
 * Runs one distributed scenario.
 *
 * Every replica creates operations independently.
 * Then every replica receives ALL operations,
 * but in a different random order.
 */
function runScenario(usersCount, operationsPerUser) {

    const replicas = [];

    for (let i = 0; i < usersCount; i++) {
        replicas.push(
            new Replica(`U${i + 1}`)
        );
    }

    const operations = [];

    /*
     * Every user independently creates operations
     * at the same location: HEAD.
     *
     * Therefore these operations are concurrent.
     */
    for (const replica of replicas) {

        for (let i = 0; i < operationsPerUser; i++) {

            const op = replica.createInsert(
                String.fromCharCode(
                    97 + (i % 26)
                ),
                "head"
            );

            /*
             * Creator sees its own operation immediately.
             */
            replica.localApply(op);

            operations.push(op);
        }
    }


    /*
     * Deliver the same operations to every replica,
     * but in a DIFFERENT random order.
     */
    for (const replica of replicas) {

        const shuffledOperations = shuffle(operations);

        for (const op of shuffledOperations) {
            replica.apply(op);
        }
    }


    /*
     * Every replica should converge to exactly
     * the same document.
     */
    const expected = replicas[0].text();

    for (const replica of replicas) {
        expect(replica.text()).toBe(expected);
    }

    return {
        operations: operations.length,
        finalLength: expected.length
    };
}


describe("CRDT randomized stress testing", () => {

    test("100 scenarios - 5 replicas × 50 operations", () => {

        let totalOperations = 0;

        for (let i = 0; i < 100; i++) {

            const result = runScenario(5, 50);

            totalOperations += result.operations;
        }

        console.log(
            `100 scenarios completed`
        );

        console.log(
            `Total operations: ${totalOperations}`
        );
    });


    test("100 scenarios - 10 replicas × 100 operations", () => {

        let totalOperations = 0;

        for (let i = 0; i < 100; i++) {

            const result = runScenario(10, 100);

            totalOperations += result.operations;
        }

        console.log(
            `100 scenarios completed`
        );

        console.log(
            `Total operations: ${totalOperations}`
        );
    });


    test("10 scenarios - 10 replicas × 500 operations", () => {

        let totalOperations = 0;

        for (let i = 0; i < 10; i++) {

            const result = runScenario(10, 500);

            totalOperations += result.operations;
        }

        console.log(
            `100 scenarios completed`
        );

        console.log(
            `Total operations: ${totalOperations}`
        );
    });

});