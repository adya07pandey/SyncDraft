import CRDTDocument from "../../src/crdt/CRDTDocument.js";
import VectorClock from "../../src/crdt/VectorClock.js";


export class Replica {

    constructor(userId) {

        this.userId = userId;

        this.doc = new CRDTDocument();

        this.clock = new VectorClock(userId);

        this.counter = 0;
    }


    createInsert(char, left = "head") {

        this.clock.increment();

        const op = {
            id: `${this.userId}-${++this.counter}`,
            type: "insert",
            char,
            left,
            vectorClock: this.clock.get(),
            sentAt: Date.now()
        };

        return op;
    }


    createDelete(targetId) {

        this.clock.increment();

        const op = {
            id: `${this.userId}-${++this.counter}`,
            type: "delete",
            targetId,
            vectorClock: this.clock.get(),
            sentAt: Date.now()
        };

        return op;
    }


    apply(op) {

        /*
         * Receiving an operation means
         * learning its causal history.
         */
        if (op.vectorClock) {
            this.clock.merge(op.vectorClock);
        }


        if (op.type === "insert") {

            this.doc.insert(op);

        } else if (op.type === "delete") {

            this.doc.delete(op.targetId);
        }
    }


    localApply(op) {

        /*
         * The operation is generated locally,
         * so apply it to our own document.
         */

        if (op.type === "insert") {

            this.doc.insert(op);

        } else if (op.type === "delete") {

            this.doc.delete(op.targetId);
        }
    }


    text() {

        return this.doc.toString();
    }
}