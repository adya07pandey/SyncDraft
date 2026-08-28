import VectorClock from "./VectorClock.js";

export default class CRDTDocument {

    constructor() {

        this.nodes = new Map();

        this.head = "head";

        this.nodes.set(this.head, {
            id: this.head,
            char: null,
            deleted: false,
            parent: null,
            vectorClock: {},
            left: null,
            right: null
        });
    }

    ensureHead() {

        if (!this.nodes.has(this.head)) {

            this.nodes.set(this.head, {
                id: this.head,
                char: null,
                deleted: false,
                parent: null,
                vectorClock: {},
                left: null,
                right: null
            });
        }
    }

    
    insert({ id, char, left, vectorClock }) {
        if (this.nodes.has(id)) {
            return;
        }
        // console.log("id- ", id);
        // console.log("char- ", char);
        // console.log("left- ", left);

        this.ensureHead();

        left = left || this.head;

        const leftNode = this.nodes.get(left);

        if (!leftNode) {
            return;
        }
        // console.log("leftnode- ", leftNode);
        const node = {
            id,
            char,
            deleted: false,

            parent: left,

            vectorClock,

            left: null,
            right: null
        };

        this.nodes.set(id, node);

        let current = leftNode.right;
        let previous = leftNode;
        // console.log("current - ", current);
        // console.log("previous - ", previous);
        while (current) {

            const currentNode = this.nodes.get(current);
            // console.log("currentnode - ", currentNode);
            if (!currentNode) {
                break;
            }

            
            if (currentNode.parent !== left) {
                break;
            }

            const relation = VectorClock.compare(
                currentNode.vectorClock,
                vectorClock
            );
            // console.log(relation)
            
            if (relation === "B_AFTER_A") {
                break;
            }

            
            if (relation === "CONCURRENT") {

                if (currentNode.id > id) {
                    break;
                }
            }

            previous = currentNode;
            current = currentNode.right;
        }

        node.left = previous.id;
        node.right = current;

        previous.right = node.id;
        // console.log("previous- ", previous.char);

        // const nextNode = previous.right
        //     ? this.nodes.get(previous.right)
        //     : null;

        // console.log("current- ", nextNode?.char);
        // console.log("current.right- ", nextNode?.right);

        
        if (current) {

            const currentNode = this.nodes.get(current);

            currentNode.left = node.id;
        }
    }

    delete(targetId) {

        if (targetId === this.head) {
            return;
        }

        const node = this.nodes.get(targetId);

        if (!node) {
            return;
        }

        node.deleted = true;
    }

    toString() {

        this.ensureHead();

        let result = "";

        let current = this.nodes.get(this.head).right;

        while (current) {

            const node = this.nodes.get(current);

            if (!node) {
                break;
            }

            if (!node.deleted) {
                result += node.char;
            }

            current = node.right;
        }

        return result;
    }
}