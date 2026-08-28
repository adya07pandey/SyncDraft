import { describe, test, expect } from "vitest";
import { Replica } from "./helpers.js";


describe("Offline user synchronization", () => {


    test("offline user creates concurrent operation", () => {

        const u1 = new Replica("U1");
        const u2 = new Replica("U2");
        const u3 = new Replica("U3");


        /*
         * Initial document:
         *
         * ab
         */

        const a = u1.createInsert("a");

        u1.localApply(a);

        u2.apply(a);
        u3.apply(a);


        const b = u1.createInsert("b", a.id);

        u1.localApply(b);

        u2.apply(b);
        u3.apply(b);


        expect(u1.text()).toBe("ab");
        expect(u2.text()).toBe("ab");
        expect(u3.text()).toBe("ab");


        /*
         * U1 goes OFFLINE.
         */


        const x = u1.createInsert("x", a.id);

        u1.localApply(x);


        /*
         * U2 and U3 don't know about x.
         */

        const y = u2.createInsert("y", a.id);

        u2.localApply(y);


        const z = u3.createInsert("z", a.id);

        u3.localApply(z);


        /*
         * x, y and z are concurrent.
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
            u2.clock.constructor.compare(
                y.vectorClock,
                z.vectorClock
            )
        ).toBe("CONCURRENT");


        /*
         * U2 and U3 communicate first.
         */

        u2.apply(z);
        u3.apply(y);


        /*
         * U1 comes back online.
         *
         * Exchange all missing operations.
         */

        u1.apply(y);
        u1.apply(z);


        u2.apply(x);

        u3.apply(x);


        /*
         * ALL replicas must converge.
         */

        expect(u1.text()).toBe(u2.text());

        expect(u2.text()).toBe(u3.text());
    });

});