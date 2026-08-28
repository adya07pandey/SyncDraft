import { describe, test, expect } from "vitest";
import WebSocket from "ws";
import crypto from "crypto";


/*
 * IMPORTANT:
 *
 * Put your deployed WebSocket endpoint here.
 *
 * Example:
 *
 * wss://xxxxxxxxxx.execute-api.ap-south-2.amazonaws.com/dev
 */
const WS_URL = process.env.WS_URL 


/*
 * Generate a unique document for every test.
 */
function createDocId() {
    return crypto.randomUUID();
}


/*
 * Connect one WebSocket client.
 */
function connectClient(clientId, docId) {

    return new Promise((resolve, reject) => {

        const socket = new WebSocket(WS_URL);

        const timeout = setTimeout(() => {
            reject(
                new Error(
                    `Connection timeout for ${clientId}`
                )
            );
        }, 15000);


        socket.on("open", () => {

            clearTimeout(timeout);

            /*
             * Join the document.
             */
            socket.send(
                JSON.stringify({
                    action: "JOIN_DOC",
                    docId,
                    userId: clientId
                })
            );

            resolve(socket);
        });


        socket.on("error", error => {

            clearTimeout(timeout);

            reject(error);
        });
    });
}


/*
 * Wait for REMOTE_OP from a WebSocket.
 */
function waitForRemoteOperation(socket) {

    return new Promise((resolve, reject) => {

        const timeout = setTimeout(() => {

            reject(
                new Error(
                    "Timed out waiting for REMOTE_OP"
                )
            );

        }, 15000);


        const handler = raw => {

            try {

                const data =
                    JSON.parse(raw.toString());


                if (data.action === "REMOTE_OP") {

                    clearTimeout(timeout);

                    socket.off("message", handler);

                    resolve(data);
                }

            } catch (error) {

                // Ignore malformed/unrelated messages.
            }
        };


        socket.on("message", handler);


        socket.on("error", error => {

            clearTimeout(timeout);

            socket.off("message", handler);

            reject(error);
        });
    });
}


/*
 * Send one operation from client A.
 */
function sendInsert(socket, docId, userId, sequence) {

    const sentAt = Date.now();

    const op = {

        id:
            `${userId}-${sequence}-${crypto.randomUUID()}`,

        type: "insert",

        char:
            String.fromCharCode(
                97 + (sequence % 26)
            ),

        left: "head",

        vectorClock: {
            [userId]: sequence
        },

        sentAt
    };


    socket.send(
        JSON.stringify({
            action: "SEND_OP",
            docId,
            op
        })
    );


    return {
        op,
        sentAt
    };
}


/*
 * Calculate percentile.
 */
function percentile(values, p) {

    const sorted =
        [...values].sort(
            (a, b) => a - b
        );


    if (sorted.length === 0) {
        return 0;
    }


    const index =
        Math.ceil(
            (p / 100) * sorted.length
        ) - 1;


    return sorted[
        Math.max(0, index)
    ];
}


/*
 * Calculate statistics.
 */
function calculateStats(latencies) {

    const sorted =
        [...latencies].sort(
            (a, b) => a - b
        );


    const total =
        sorted.reduce(
            (sum, value) => sum + value,
            0
        );


    return {

        samples:
            sorted.length,

        min:
            Number(
                Math.min(...sorted).toFixed(2)
            ),

        max:
            Number(
                Math.max(...sorted).toFixed(2)
            ),

        average:
            Number(
                (
                    total /
                    sorted.length
                ).toFixed(2)
            ),

        p50:
            Number(
                percentile(sorted, 50).toFixed(2)
            ),

        p95:
            Number(
                percentile(sorted, 95).toFixed(2)
            ),

        p99:
            Number(
                percentile(sorted, 99).toFixed(2)
            )
    };
}


/*
 * Run one latency benchmark.
 */
async function runLatencyTest(operationCount) {

    const docId =
        createDocId();


    const clientA =
        await connectClient(
            `sender-${crypto.randomUUID()}`,
            docId
        );


    const clientB =
        await connectClient(
            `receiver-${crypto.randomUUID()}`,
            docId
        );


    const latencies = [];

    let received = 0;


    try {

        /*
         * Give API Gateway/Lambda time
         * to establish both subscriptions.
         */
        await new Promise(
            resolve => setTimeout(resolve, 500)
        );


        for (
            let i = 1;
            i <= operationCount;
            i++
        ) {

            /*
             * Start listening BEFORE sending.
             */
            const receivePromise =
                waitForRemoteOperation(clientB);


            const {
                op,
                sentAt
            } =
                sendInsert(
                    clientA,
                    docId,
                    "sender",
                    i
                );


            const result =
                await receivePromise;


            /*
             * Verify that the received operation
             * is actually the operation we sent.
             */
            if (
                result.op &&
                result.op.id === op.id
            ) {

                const latency =
                    Date.now() - sentAt;

                latencies.push(latency);

                received++;
            }
        }


        const stats =
            calculateStats(latencies);


        return {

            operationCount,

            received,

            packetLoss:
                operationCount - received,

            packetLossPercent:
                Number(
                    (
                        (
                            operationCount -
                            received
                        ) /
                        operationCount *
                        100
                    ).toFixed(2)
                ),

            ...stats
        };

    } finally {

        clientA.close();

        clientB.close();
    }
}


/*
 * Tests
 */
describe(
    "End-to-end WebSocket synchronization latency",
    () => {


        test(
            "10 operations",
            async () => {

                const result =
                    await runLatencyTest(10);


                console.table(result);


                expect(result.received)
                    .toBe(result.operationCount);

            },
            30000
        );


        test(
            "50 operations",
            async () => {

                const result =
                    await runLatencyTest(50);


                console.table(result);


                expect(result.received)
                    .toBe(result.operationCount);

            },
            60000
        );


        test(
            "100 operations",
            async () => {

                const result =
                    await runLatencyTest(100);


                console.table(result);


                expect(result.received)
                    .toBe(result.operationCount);

            },
            120000
        );

    }
);