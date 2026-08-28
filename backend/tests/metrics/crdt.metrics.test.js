import { describe, test, expect } from "vitest";
import { Replica } from "../simulation/helpers.js";

function runScenario(replicaCount, operationsPerReplica) {

    const replicas = [];

    for (let i = 0; i < replicaCount; i++) {
        replicas.push(new Replica(`U${i}`));
    }

    const allOperations = [];

    const start = performance.now();

    // Generate local operations
    for (const replica of replicas) {

        for (let i = 0; i < operationsPerReplica; i++) {

            const text = replica.text();

            let left = "head";

            if (text.length > 0) {

                // For this benchmark we append to the current document.
                const nodes = [...replica.doc.nodes.values()]
                    .filter(node => node.id !== "head" && !node.deleted);

                if (nodes.length > 0) {
                    left = nodes[nodes.length - 1].id;
                }
            }

            const op = replica.createInsert("x", left);

            replica.localApply(op);

            allOperations.push(op);
        }
    }

    // Deliver operations to every other replica
    for (const op of allOperations) {

        for (const replica of replicas) {

            const owner = op.id.split("-")[0];

            if (owner !== replica.userId) {
                replica.apply(op);
            }
        }
    }

    const end = performance.now();

    const durationMs = end - start;

    const totalOperations =
        replicaCount * operationsPerReplica;

    const operationsPerSecond =
        (totalOperations / durationMs) * 1000;

    const texts = replicas.map(r => r.text());

    const converged =
        texts.every(text => text === texts[0]);

    return {
        replicaCount,
        operationsPerReplica,
        totalOperations,
        durationMs,
        operationsPerSecond,
        averageMsPerOperation:
            durationMs / totalOperations,
        converged
    };
}


describe("CRDT system metrics", () => {

    test(
        "5 replicas × 100 operations",
        () => {

            const result = runScenario(5, 100);

            console.table(result);

            expect(result.converged).toBe(true);
        },
        30000
    );


    test(
        "10 replicas × 100 operations",
        () => {

            const result = runScenario(10, 100);

            console.table(result);

            expect(result.converged).toBe(true);
        },
        120000
    );


    test(
        "10 replicas × 250 operations",
        () => {

            const result = runScenario(10, 250);

            console.table(result);

            expect(result.converged).toBe(true);
        },
        120000
    );

});