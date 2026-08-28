import { describe, bench } from "vitest";
import CRDTDocument from "../../src/crdt/CRDTDocument.js";

function makeOp(i, left, user = "U1") {
    return {
        id: `${user}-${i}`,
        type: "insert",
        char: String.fromCharCode(97 + (i % 26)),
        left,
        vectorClock: {
            [user]: i + 1
        },
        sentAt: Date.now()
    };
}

describe("CRDT performance", () => {

    bench("insert 1,000 sequential operations", () => {

        const doc = new CRDTDocument();

        let left = "head";

        for (let i = 0; i < 1000; i++) {

            const op = makeOp(i, left);

            doc.insert(op);

            left = op.id;
        }

    });

    bench("insert 10,000 sequential operations", () => {

        const doc = new CRDTDocument();

        let left = "head";

        for (let i = 0; i < 10000; i++) {

            const op = makeOp(i, left);

            doc.insert(op);

            left = op.id;
        }

    });

});