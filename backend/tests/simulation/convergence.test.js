import { describe, test, expect } from "vitest";
import { Replica } from "./helpers.js";


describe("CRDT convergence", () => {


    test("different delivery orders converge", () => {

        const creator = new Replica("creator");


        /*
         * Common history:
         *
         * ab
         */

        const a = creator.createInsert("a");

        creator.localApply(a);


        const b = creator.createInsert("b", a.id);

        creator.localApply(b);


        /*
         * Create replicas from the same history.
         */

        const u1 = new Replica("U1");
        const u2 = new Replica("U2");
        const u3 = new Replica("U3");


        for (const replica of [u1, u2, u3]) {

            replica.apply(a);
            replica.apply(b);
        }


        /*
         * Now each replica creates
         * a concurrent operation after a.
         */

        const x = u1.createInsert("x", a.id);

        const y = u2.createInsert("y", a.id);

        const z = u3.createInsert("z", a.id);


        u1.localApply(x);
        u2.localApply(y);
        u3.localApply(z);


        /*
         * Different network delivery orders.
         */

        u1.apply(y);
        u1.apply(z);


        u2.apply(z);
        u2.apply(x);


        u3.apply(x);
        u3.apply(y);


        /*
         * Final states must match.
         */

        expect(u1.text()).toBe(u2.text());

        expect(u2.text()).toBe(u3.text());
    });


    test("same operations in all permutations converge", () => {

        const creator = new Replica("creator");


        const a = creator.createInsert("a");

        creator.localApply(a);


        const u1 = new Replica("U1");
        const u2 = new Replica("U2");
        const u3 = new Replica("U3");


        for (const replica of [u1, u2, u3]) {
            replica.apply(a);
        }


        const x = u1.createInsert("x", a.id);

        const y = u2.createInsert("y", a.id);

        const z = u3.createInsert("z", a.id);


        /*
         * Replica 1:
         * x y z
         */

        u1.localApply(x);
        u1.apply(y);
        u1.apply(z);


        /*
         * Replica 2:
         * y z x
         */

        u2.localApply(y);
        u2.apply(z);
        u2.apply(x);


        /*
         * Replica 3:
         * z x y
         */

        u3.localApply(z);
        u3.apply(x);
        u3.apply(y);


        expect(u1.text()).toBe(u2.text());

        expect(u2.text()).toBe(u3.text());
    });

});