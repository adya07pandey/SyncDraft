import { describe, test, expect } from "vitest";
import { Replica } from "./helpers.js";


describe("Sequential operations", () => {


    test("single user creates abc", () => {

        const user = new Replica("U1");


        const a = user.createInsert("a");

        user.localApply(a);


        const b = user.createInsert("b", a.id);

        user.localApply(b);


        const c = user.createInsert("c", b.id);

        user.localApply(c);


        expect(user.text()).toBe("abc");
    });


    test("single user inserts in the middle", () => {

        const user = new Replica("U1");


        const a = user.createInsert("a");

        user.localApply(a);


        const b = user.createInsert("b", a.id);

        user.localApply(b);


        const c = user.createInsert("c", b.id);

        user.localApply(c);


        /*
         * Insert x after a.
         */

        const x = user.createInsert("x", a.id);

        user.localApply(x);


        expect(user.text()).toBe("axbc");
    });


    test("single user inserts at beginning", () => {

        const user = new Replica("U1");


        const a = user.createInsert("a");

        user.localApply(a);


        const b = user.createInsert("b", a.id);

        user.localApply(b);


        const x = user.createInsert("x", "head");

        user.localApply(x);


        expect(user.text()).toBe("xab");
    });


    test("single user inserts at end", () => {

        const user = new Replica("U1");


        const a = user.createInsert("a");

        user.localApply(a);


        const b = user.createInsert("b", a.id);

        user.localApply(b);


        const x = user.createInsert("x", b.id);

        user.localApply(x);


        expect(user.text()).toBe("abx");
    });

});