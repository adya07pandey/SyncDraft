import { describe, test, expect } from "vitest";
import CRDTDocument from "../src/crdt/CRDTDocument.js";


function insert(doc, {
    id,
    char,
    left = "head",
    vectorClock
}) {

    doc.insert({
        id,
        char,
        left,
        vectorClock
    });
}


describe("CRDTDocument", () => {

    test("new document is empty", () => {

        const doc = new CRDTDocument();

        expect(doc.toString()).toBe("");
    });


    test("insert one character", () => {

        const doc = new CRDTDocument();

        insert(doc, {
            id: "A1",
            char: "a",
            vectorClock: {
                A: 1
            }
        });

        expect(doc.toString()).toBe("a");
    });


    test("sequential inserts produce abc", () => {

        const doc = new CRDTDocument();

        insert(doc, {
            id: "A1",
            char: "a",
            vectorClock: {
                A: 1
            }
        });

        insert(doc, {
            id: "A2",
            char: "b",
            left: "A1",
            vectorClock: {
                A: 2
            }
        });

        insert(doc, {
            id: "A3",
            char: "c",
            left: "A2",
            vectorClock: {
                A: 3
            }
        });

        expect(doc.toString()).toBe("abc");
    });


    test("insert in the middle", () => {

        const doc = new CRDTDocument();

        const a = {
            id: "a",
            type: "insert",
            char: "a",
            left: "head",
            vectorClock: { U1: 1 }
        };

        const x = {
            id: "x",
            type: "insert",
            char: "x",
            left: "a",
            vectorClock: { U1: 2 }
        };

        const b = {
            id: "b",
            type: "insert",
            char: "b",
            left: "x",
            vectorClock: { U1: 3 }
        };

        const c = {
            id: "c",
            type: "insert",
            char: "c",
            left: "b",
            vectorClock: { U1: 4 }
        };

        doc.insert(a);
        doc.insert(x);
        doc.insert(b);
        doc.insert(c);

        expect(doc.toString()).toBe("axbc");
    });

    test("insert at beginning", () => {

        const doc = new CRDTDocument();

        insert(doc, {
            id: "A1",
            char: "a",
            vectorClock: {
                A: 1
            }
        });

        insert(doc, {
            id: "A2",
            char: "b",
            left: "A1",
            vectorClock: {
                A: 2
            }
        });

        insert(doc, {
            id: "A3",
            char: "x",
            left: "head",
            vectorClock: {
                A: 3
            }
        });

        expect(doc.toString()).toBe("xab");
    });


    test("insert at end", () => {

        const doc = new CRDTDocument();

        insert(doc, {
            id: "A1",
            char: "a",
            vectorClock: {
                A: 1
            }
        });

        insert(doc, {
            id: "A2",
            char: "b",
            left: "A1",
            vectorClock: {
                A: 2
            }
        });

        insert(doc, {
            id: "A3",
            char: "x",
            left: "A2",
            vectorClock: {
                A: 3
            }
        });

        expect(doc.toString()).toBe("abx");
    });


    test("delete character", () => {

        const doc = new CRDTDocument();

        insert(doc, {
            id: "A1",
            char: "a",
            vectorClock: {
                A: 1
            }
        });

        insert(doc, {
            id: "A2",
            char: "b",
            left: "A1",
            vectorClock: {
                A: 2
            }
        });

        insert(doc, {
            id: "A3",
            char: "c",
            left: "A2",
            vectorClock: {
                A: 3
            }
        });

        doc.delete("A2");

        expect(doc.toString()).toBe("ac");
    });


    test("deleting HEAD does nothing", () => {

        const doc = new CRDTDocument();

        doc.delete("head");

        expect(doc.toString()).toBe("");
    });


    test("duplicate operation is ignored", () => {

        const doc = new CRDTDocument();

        const operation = {
            id: "A1",
            char: "a",
            left: "head",
            vectorClock: {
                A: 1
            }
        };

        doc.insert(operation);
        doc.insert(operation);

        expect(doc.toString()).toBe("a");
    });


    test("operation with missing parent is ignored", () => {

        const doc = new CRDTDocument();

        insert(doc, {
            id: "A2",
            char: "b",
            left: "A1",
            vectorClock: {
                A: 2
            }
        });

        expect(doc.toString()).toBe("");
    });


    test("two concurrent inserts use ID ordering", () => {

        const doc = new CRDTDocument();

        insert(doc, {
            id: "A",
            char: "x",
            left: "head",
            vectorClock: {
                user1: 1
            }
        });

        insert(doc, {
            id: "B",
            char: "y",
            left: "head",
            vectorClock: {
                user2: 1
            }
        });

        expect(doc.toString()).toBe("xy");
    });


    test("concurrent inserts converge regardless of arrival order", () => {

        const doc1 = new CRDTDocument();

        insert(doc1, {
            id: "A",
            char: "x",
            left: "head",
            vectorClock: {
                user1: 1
            }
        });

        insert(doc1, {
            id: "B",
            char: "y",
            left: "head",
            vectorClock: {
                user2: 1
            }
        });


        const doc2 = new CRDTDocument();

        insert(doc2, {
            id: "B",
            char: "y",
            left: "head",
            vectorClock: {
                user2: 1
            }
        });

        insert(doc2, {
            id: "A",
            char: "x",
            left: "head",
            vectorClock: {
                user1: 1
            }
        });


        expect(doc1.toString()).toBe(doc2.toString());
    });


    test("three concurrent users converge", () => {

        const operations = [
            {
                id: "A",
                char: "x",
                left: "head",
                vectorClock: {
                    user1: 1
                }
            },
            {
                id: "B",
                char: "y",
                left: "head",
                vectorClock: {
                    user2: 1
                }
            },
            {
                id: "C",
                char: "z",
                left: "head",
                vectorClock: {
                    user3: 1
                }
            }
        ];


        const orders = [
            ["A", "B", "C"],
            ["A", "C", "B"],
            ["B", "A", "C"],
            ["B", "C", "A"],
            ["C", "A", "B"],
            ["C", "B", "A"]
        ];


        const results = [];


        for (const order of orders) {

            const doc = new CRDTDocument();

            for (const id of order) {

                const operation = operations.find(
                    op => op.id === id
                );

                doc.insert(operation);
            }

            results.push(doc.toString());
        }


        for (const result of results) {
            expect(result).toBe(results[0]);
        }
    });

});