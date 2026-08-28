import { describe, test, expect } from "vitest";
import VectorClock from "../src/crdt/VectorClock.js";


describe("VectorClock", () => {

    test("new vector clock starts at 0", () => {

        const clock = new VectorClock("A");

        expect(clock.get()).toEqual({
            A: 0
        });
    });


    test("increment increases own clock", () => {

        const clock = new VectorClock("A");

        clock.increment();

        expect(clock.get()).toEqual({
            A: 1
        });

        clock.increment();

        expect(clock.get()).toEqual({
            A: 2
        });
    });


    test("merge combines clocks using maximum value", () => {

        const clock = new VectorClock("A");

        clock.increment();

        clock.merge({
            B: 3,
            C: 2
        });

        expect(clock.get()).toEqual({
            A: 1,
            B: 3,
            C: 2
        });
    });


    test("merge does not decrease existing clock values", () => {

        const clock = new VectorClock("A");

        clock.increment();
        clock.increment();
        clock.increment();

        clock.merge({
            A: 1
        });

        expect(clock.get()).toEqual({
            A: 3
        });
    });


    test("detects causal relationship A happened before B", () => {

        const A = {
            A: 1
        };

        const B = {
            A: 1,
            B: 1
        };

        expect(VectorClock.compare(A, B))
            .toBe("B_AFTER_A");
    });


    test("detects causal relationship B happened before A", () => {

        const A = {
            A: 1,
            B: 1
        };

        const B = {
            B: 1
        };

        expect(VectorClock.compare(A, B))
            .toBe("A_AFTER_B");
    });


    test("detects concurrent operations", () => {

        const A = {
            A: 1
        };

        const B = {
            B: 1
        };

        expect(VectorClock.compare(A, B))
            .toBe("CONCURRENT");
    });


    test("detects three concurrent users", () => {

        const A = {
            A: 1
        };

        const B = {
            B: 1
        };

        const C = {
            C: 1
        };

        expect(VectorClock.compare(A, B))
            .toBe("CONCURRENT");

        expect(VectorClock.compare(A, C))
            .toBe("CONCURRENT");

        expect(VectorClock.compare(B, C))
            .toBe("CONCURRENT");
    });


    test("detects equal clocks", () => {

        const A = {
            A: 2,
            B: 3
        };

        const B = {
            A: 2,
            B: 3
        };

        expect(VectorClock.compare(A, B))
            .toBe("EQUAL");
    });


    test("empty clocks are equal", () => {

        expect(VectorClock.compare({}, {}))
            .toBe("EQUAL");
    });

});