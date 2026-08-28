import { describe, test, expect } from "vitest";
import { Replica } from "./helpers.js";


describe("Concurrent operations", () => {


    test("two users insert concurrently at same position", () => {

        const user1 = new Replica("U1");
        const user2 = new Replica("U2");


        /*
         * Both users start with:
         *
         * abc
         */


        const a = user1.createInsert("a");

        user1.localApply(a);

        user2.apply(a);


        const b = user1.createInsert("b", a.id);

        user1.localApply(b);

        user2.apply(b);


        const c = user1.createInsert("c", b.id);

        user1.localApply(c);

        user2.apply(c);


        expect(user1.text()).toBe("abc");
        expect(user2.text()).toBe("abc");


        /*
         * NOW they edit concurrently.
         *
         * Both know abc.
         */


        const x = user1.createInsert("x", a.id);

        const y = user2.createInsert("y", a.id);


        /*
         * Important:
         *
         * U1 has not received y.
         * U2 has not received x.
         *
         * Therefore:
         *
         * x || y
         */


        expect(
            user1.clock.constructor.compare(
                x.vectorClock,
                y.vectorClock
            )
        ).toBe("CONCURRENT");


        /*
         * Apply locally.
         */

        user1.localApply(x);
        user2.localApply(y);


        /*
         * Exchange operations.
         */

        user1.apply(y);
        user2.apply(x);


        /*
         * Both replicas MUST converge.
         */

        expect(user1.text()).toBe(user2.text());
    });


    test("three users concurrently insert at same position", () => {

        const u1 = new Replica("U1");
        const u2 = new Replica("U2");
        const u3 = new Replica("U3");


        /*
         * Create common initial state.
         */

        const a = u1.createInsert("a");

        u1.localApply(a);

        u2.apply(a);
        u3.apply(a);


        const b = u1.createInsert("b", a.id);

        u1.localApply(b);

        u2.apply(b);
        u3.apply(b);


        /*
         * Concurrent operations.
         */

        const x = u1.createInsert("x", a.id);
        const y = u2.createInsert("y", a.id);
        const z = u3.createInsert("z", a.id);


        /*
         * They must all be concurrent.
         */

        expect(
            u1.clock.constructor.compare(
                x.vectorClock,
                y.vectorClock
            )
        ).toBe("CONCURRENT");


        expect(
            u1.clock.constructor.compare(
                x.vectorClock,
                z.vectorClock
            )
        ).toBe("CONCURRENT");


        expect(
            u1.clock.constructor.compare(
                y.vectorClock,
                z.vectorClock
            )
        ).toBe("CONCURRENT");


        /*
         * Apply locally.
         */

        u1.localApply(x);
        u2.localApply(y);
        u3.localApply(z);


        /*
         * Exchange in DIFFERENT orders.
         */

        u1.apply(z);
        u1.apply(y);


        u2.apply(x);
        u2.apply(z);


        u3.apply(y);
        u3.apply(x);


        /*
         * All must converge.
         */

        expect(u1.text()).toBe(u2.text());

        expect(u2.text()).toBe(u3.text());
    });

});