import { describe, test, expect } from "vitest";
import CRDTDocument from "../../src/crdt/CRDTDocument.js";
import VectorClock from "../../src/crdt/VectorClock.js";
import WebSocket from "ws";
import crypto from "crypto";


/*
==========================================================
CONFIGURATION
==========================================================
*/

const WS_URL = process.env.WS_URL;

if (!WS_URL) {
    throw new Error(
        "WS_URL is not set.\n" +
        "PowerShell:\n" +
        '$env:WS_URL="wss://YOUR_API_ID.execute-api.ap-south-2.amazonaws.com/dev"'
    );
}


/*
==========================================================
REPLICA
==========================================================
*/

class Replica {

    constructor(userId) {

        this.userId = userId;

        this.doc = new CRDTDocument();

        this.clock =
            new VectorClock(userId);

        this.counter = 0;
    }


    createInsert(char, left = "head") {

        this.clock.increment();

        return {

            id:
                `${this.userId}-${++this.counter}-${crypto.randomUUID()}`,

            type: "insert",

            char,

            left,

            vectorClock:
                this.clock.get(),

            sentAt:
                Date.now()
        };
    }


    createDelete(targetId) {

        this.clock.increment();

        return {

            id:
                `${this.userId}-${++this.counter}-${crypto.randomUUID()}`,

            type: "delete",

            targetId,

            vectorClock:
                this.clock.get(),

            sentAt:
                Date.now()
        };
    }


    apply(op) {

        if (op.vectorClock) {

            this.clock.merge(
                op.vectorClock
            );
        }


        if (op.type === "insert") {

            this.doc.insert(op);

        } else if (op.type === "delete") {

            this.doc.delete(
                op.targetId
            );
        }
    }


    text() {

        return this.doc.toString();
    }
}


/*
==========================================================
DOCUMENT HELPERS
==========================================================
*/

function visibleNodes(doc) {

    const result = [];

    let current =
        doc.nodes.get("head")?.right;


    while (current) {

        const node =
            doc.nodes.get(current);


        if (!node) {
            break;
        }


        if (!node.deleted) {

            result.push(node);
        }


        current =
            node.right;
    }


    return result;
}


function randomVisibleNode(doc) {

    const nodes =
        visibleNodes(doc);


    if (nodes.length === 0) {

        return null;
    }


    return nodes[
        Math.floor(
            Math.random() *
            nodes.length
        )
    ];
}


function randomInsertionPoint(doc) {

    const nodes =
        visibleNodes(doc);


    if (nodes.length === 0) {

        return "head";
    }


    const index =
        Math.floor(
            Math.random() *
            (nodes.length + 1)
        );


    if (index === 0) {

        return "head";
    }


    return nodes[index - 1].id;
}


/*
==========================================================
MIXED CRDT WORKLOAD
==========================================================
*/

function generateWorkload(
    replicas,
    operationsPerReplica
) {

    const operations = [];


    for (const replica of replicas) {

        for (
            let i = 0;
            i < operationsPerReplica;
            i++
        ) {

            const roll =
                Math.random();


            /*
            ------------------------------------------
            SINGLE INSERT
            ------------------------------------------
            */

            if (roll < 0.45) {

                const left =
                    randomInsertionPoint(
                        replica.doc
                    );


                const op =
                    replica.createInsert(
                        String.fromCharCode(
                            97 +
                            Math.floor(
                                Math.random() *
                                26
                            )
                        ),
                        left
                    );


                /*
                 * Apply locally so this user's
                 * causal chain remains valid.
                 */

                replica.apply(op);

                operations.push(op);
            }


            /*
            ------------------------------------------
            PASTE
            ------------------------------------------
            */

            else if (roll < 0.65) {

                let parent =
                    randomInsertionPoint(
                        replica.doc
                    );


                const pasteLength =
                    2 +
                    Math.floor(
                        Math.random() * 8
                    );


                for (
                    let j = 0;
                    j < pasteLength;
                    j++
                ) {

                    const op =
                        replica.createInsert(
                            String.fromCharCode(
                                97 +
                                Math.floor(
                                    Math.random() *
                                    26
                                )
                            ),
                            parent
                        );


                    replica.apply(op);

                    operations.push(op);

                    parent = op.id;
                }
            }


            /*
            ------------------------------------------
            SINGLE DELETE
            ------------------------------------------
            */

            else if (roll < 0.85) {

                const target =
                    randomVisibleNode(
                        replica.doc
                    );


                if (!target) {

                    continue;
                }


                const op =
                    replica.createDelete(
                        target.id
                    );


                replica.apply(op);

                operations.push(op);
            }


            /*
            ------------------------------------------
            RANGE DELETE
            ------------------------------------------
            */

            else {

                const nodes =
                    visibleNodes(
                        replica.doc
                    );


                if (nodes.length === 0) {

                    continue;
                }


                const start =
                    Math.floor(
                        Math.random() *
                        nodes.length
                    );


                const maxLength =
                    Math.min(
                        10,
                        nodes.length - start
                    );


                const length =
                    1 +
                    Math.floor(
                        Math.random() *
                        maxLength
                    );


                for (
                    let j = start;
                    j < start + length;
                    j++
                ) {

                    const op =
                        replica.createDelete(
                            nodes[j].id
                        );


                    replica.apply(op);

                    operations.push(op);
                }
            }
        }
    }


    return operations;
}


/*
==========================================================
CONCURRENT CRDT BENCHMARK
==========================================================
*/

function runCRDTBenchmark(
    replicaCount,
    operationsPerReplica
) {

    /*
     * Create users.
     */

    const generators = [];

    for (
        let i = 0;
        i < replicaCount;
        i++
    ) {

        generators.push(
            new Replica(
                `U${i + 1}`
            )
        );
    }


    /*
     * Generate operations locally.
     */

    const operations =
        generateWorkload(
            generators,
            operationsPerReplica
        );


    /*
     * Fresh replicas for replay.
     */

    const replicas = [];

    for (
        let i = 0;
        i < replicaCount;
        i++
    ) {

        replicas.push(
            new Replica(
                `U${i + 1}`
            )
        );
    }


    /*
     * Group operations by user.
     *
     * This preserves causal order inside
     * each user's operation stream.
     */

    const groups =
        new Map();


    for (const op of operations) {

        /*
         * ID format:
         *
         * U1-counter-uuid
         */

        const owner =
            op.id.split("-")[0];


        if (!groups.has(owner)) {

            groups.set(
                owner,
                []
            );
        }


        groups
            .get(owner)
            .push(op);
    }


    /*
     * Deliver batches from different users.
     *
     * This creates concurrency while
     * preserving causality.
     */

    const queues =
        [...groups.values()];


    const deliveryOrder = [];


    while (
        queues.some(
            queue =>
                queue.length > 0
        )
    ) {

        const available =
            queues.filter(
                queue =>
                    queue.length > 0
            );


        const queue =
            available[
                Math.floor(
                    Math.random() *
                    available.length
                )
            ];


        const batchSize =
            Math.min(
                queue.length,
                1 +
                Math.floor(
                    Math.random() * 5
                )
            );


        deliveryOrder.push(
            ...queue.splice(
                0,
                batchSize
            )
        );
    }


    /*
     * START MEASUREMENT
     */

    const start =
        performance.now();


    for (const op of deliveryOrder) {

        for (const replica of replicas) {

            replica.apply(op);
        }
    }


    const duration =
        performance.now() - start;


    /*
     * Check convergence.
     */

    const texts =
        replicas.map(
            replica =>
                replica.text()
        );


    const converged =
        texts.every(
            text =>
                text === texts[0]
        );


    return {

        replicaCount,

        requestedOperationsPerReplica:
            operationsPerReplica,

        totalOperations:
            operations.length,

        durationMs:
            Number(
                duration.toFixed(3)
            ),

        operationsPerSecond:
            Math.round(
                operations.length /
                (duration / 1000)
            ),

        averageMsPerOperation:
            Number(
                (
                    duration /
                    operations.length
                ).toFixed(6)
            ),

        finalDocumentLength:
            texts[0]?.length ?? 0,

        converged
    };
}


/*
==========================================================
WEBSOCKET LATENCY
==========================================================
*/


function connectClient(
    clientId,
    docId
) {

    return new Promise(
        (resolve, reject) => {

            const socket =
                new WebSocket(
                    WS_URL
                );


            const timeout =
                setTimeout(
                    () => {

                        socket.close();

                        reject(
                            new Error(
                                `Connection timeout: ${clientId}`
                            )
                        );

                    },
                    15000
                );


            socket.once(
                "open",
                () => {

                    clearTimeout(
                        timeout
                    );


                    socket.send(
                        JSON.stringify({
                            action:
                                "JOIN_DOC",

                            docId,

                            userId:
                                clientId
                        })
                    );


                    resolve(socket);
                }
            );


            socket.once(
                "error",
                error => {

                    clearTimeout(
                        timeout
                    );

                    reject(error);
                }
            );
        }
    );
}


/*
 * Wait for one specific operation.
 *
 * We DON'T add a new error listener
 * for every operation.
 */

function waitForOperation(
    socket,
    operationId
) {

    return new Promise(
        (resolve, reject) => {

            const timeout =
                setTimeout(
                    () => {

                        socket.off(
                            "message",
                            handler
                        );

                        reject(
                            new Error(
                                `Timeout waiting for ${operationId}`
                            )
                        );

                    },
                    15000
                );


            function handler(raw) {

                try {

                    const data =
                        JSON.parse(
                            raw.toString()
                        );


                    if (
                        data.action ===
                        "REMOTE_OP"
                    ) {

                        if (
                            data.op?.id ===
                            operationId
                        ) {

                            clearTimeout(
                                timeout
                            );


                            socket.off(
                                "message",
                                handler
                            );


                            resolve(data);
                        }
                    }

                } catch {
                    // Ignore invalid messages.
                }
            }


            socket.on(
                "message",
                handler
            );
        }
    );
}


/*
==========================================================
WEBSOCKET LATENCY TEST
==========================================================
*/

async function runWebSocketBenchmark(
    operationCount
) {

    const docId =
        crypto.randomUUID();


    const senderId =
        `sender-${crypto.randomUUID()}`;


    const receiverId =
        `receiver-${crypto.randomUUID()}`;


    const sender =
        await connectClient(
            senderId,
            docId
        );


    const receiver =
        await connectClient(
            receiverId,
            docId
        );


    const latencies = [];


    try {

        /*
         * Allow both JOIN_DOC operations
         * to complete.
         */

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    500
                )
        );


        /*
         * IMPORTANT:
         *
         * Send operations sequentially.
         *
         * This measures actual end-to-end
         * synchronization latency.
         */

        for (
            let i = 1;
            i <= operationCount;
            i++
        ) {

            const op = {

                id:
                    `benchmark-${i}-${crypto.randomUUID()}`,

                type:
                    "insert",

                char:
                    String.fromCharCode(
                        97 +
                        (i % 26)
                    ),

                left:
                    "head",

                vectorClock: {
                    benchmark:
                        i
                },

                sentAt:
                    Date.now()
            };


            /*
             * Start listening BEFORE sending.
             */

            const received =
                waitForOperation(
                    receiver,
                    op.id
                );


            const sentAt =
                Date.now();


            sender.send(
                JSON.stringify({

                    action:
                        "SEND_OP",

                    docId,

                    op
                })
            );


            await received;


            const latency =
                Date.now() -
                sentAt;


            latencies.push(
                latency
            );
        }


        /*
         * Statistics
         */

        const sorted =
            [...latencies].sort(
                (a, b) =>
                    a - b
            );


        const sum =
            sorted.reduce(
                (a, b) =>
                    a + b,
                0
            );


        function percentile(p) {

            const index =
                Math.ceil(
                    (p / 100) *
                    sorted.length
                ) - 1;


            return sorted[
                Math.max(
                    0,
                    index
                )
            ];
        }


        return {

            operationCount,

            received:
                latencies.length,

            packetLoss:
                operationCount -
                latencies.length,

            packetLossPercent:
                0,

            min:
                Math.min(
                    ...sorted
                ),

            max:
                Math.max(
                    ...sorted
                ),

            average:
                Number(
                    (
                        sum /
                        sorted.length
                    ).toFixed(2)
                ),

            p50:
                percentile(50),

            p95:
                percentile(95),

            p99:
                percentile(99)
        };

    } finally {

        sender.close();

        receiver.close();
    }
}


/*
==========================================================
FINAL RESUME BENCHMARKS
==========================================================
*/

describe(
    "SyncDraft resume benchmarks",
    () => {


        /*
         * METRIC 1 + 2
         *
         * Convergence + throughput
         */

        test(
            "50 replicas mixed CRDT workload",
            () => {

                const result =
                    runCRDTBenchmark(
                        50,
                        50
                    );


                console.log(
                    "\n===== CRDT BENCHMARK ====="
                );


                console.table(
                    result
                );


                /*
                 * This is the important
                 * correctness assertion.
                 */

                expect(
                    result.converged
                ).toBe(true);


                expect(
                    result.totalOperations
                ).toBeGreaterThan(0);
            }
        );


        /*
         * METRIC 3
         *
         * Real AWS WebSocket latency
         */

        test(
            "100 AWS WebSocket operations",
            async () => {

                const result =
                    await runWebSocketBenchmark(
                        100
                    );


                console.log(
                    "\n===== WEBSOCKET BENCHMARK ====="
                );


                console.table(
                    result
                );


                /*
                 * Every operation must
                 * reach the receiver.
                 */

                expect(
                    result.received
                ).toBe(
                    result.operationCount
                );


                expect(
                    result.packetLoss
                ).toBe(0);
            },
            120000
        );

    }
);