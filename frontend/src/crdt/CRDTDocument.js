export default class CRDTDocument {
    constructor() {
        this.nodes = new Map();
        this.head = null;
    }

    insert({ id, char, left }) {

        if (this.nodes.has(id)) return;

        const node = {
            id,
            char,
            deleted: false,
            left,
            right: null
        };

        this.nodes.set(id, node);

        if (!left) {

            if (!this.head || id < this.head) {
                node.right = this.head;
                this.head = id;
                return;
            }

            let current = this.head;
            let previous = null;

            while (current && current < id) {
                previous = current;
                current = this.nodes.get(current).right;
            }

            node.right = current;
            this.nodes.get(previous).right = id;

            return;
        }

        const leftNode = this.nodes.get(left);

        if (!leftNode) return;

        let currentRight = leftNode.right;
        let previous = leftNode;

        while (
            currentRight &&
            this.nodes.get(currentRight)?.left === left &&
            currentRight < id
        ) {
            previous = this.nodes.get(currentRight);
            currentRight = previous.right;
        }

        node.right = currentRight;
        previous.right = id;

        // if (currentRight) {
        //     this.nodes.get(currentRight).left = id;
        // }
    }

    delete(targetId) {
        const node = this.nodes.get(targetId);
        if (node) node.deleted = true;
    }


    toString() {
        let result = "";
        let current = this.head;

        while (current) {
            const node = this.nodes.get(current);
            if (!node.deleted) result += node.char;
            current = node.right;
        }

        return result;
    }
}
