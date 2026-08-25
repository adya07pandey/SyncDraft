export default class CRDTDocument {
    constructor() {
        this.nodes = new Map();

        // Permanent sentinel node
        this.head = "head";

        this.nodes.set(this.head, {
            id: this.head,
            char: null,
            deleted: false,
            left: null,
            right: null
        });
    }

    insert({ id, char, left }) {

        // Duplicate operation
        if (this.nodes.has(id)) return;

        // If no left is provided, insert after HEAD
        left = left || this.head;

        // Left dependency must exist
        const leftNode = this.nodes.get(left);

        if (!leftNode) {
            return;
        }

        const node = {
            id,
            char,
            deleted: false,
            left: null,
            right: null
        };

        this.nodes.set(id, node);

        /*
         * Find where this node belongs.
         *
         * All nodes inserted concurrently after the
         * same left node are ordered by their id.
         */

        let current = leftNode.right;
        let previous = leftNode;

        while (current) {

            const currentNode = this.nodes.get(current);

            if (!currentNode) break;

            // Only compare direct concurrent siblings.
            if (currentNode.left !== left) {
                break;
            }

            // Smaller ID comes first.
            if (currentNode.id > id) {
                break;
            }

            previous = currentNode;
            current = currentNode.right;
        }

        /*
         * Insert:
         *
         * previous <-> current
         *
         * becomes:
         *
         * previous <-> node <-> current
         */

        node.left = previous.id;
        node.right = current;

        previous.right = node.id;

        if (current) {
            const currentNode = this.nodes.get(current);
            currentNode.left = node.id;
        }
    }

    delete(targetId) {

        // Never delete HEAD
        if (targetId === this.head) {
            return;
        }

        const node = this.nodes.get(targetId);

        if (!node) {
            return;
        }

        // Tombstone
        node.deleted = true;
    }

    toString() {

        let result = "";

        // Start after HEAD
        let current = this.nodes.get(this.head).right;

        while (current) {

            const node = this.nodes.get(current);

            if (!node.deleted) {
                result += node.char;
            }

            current = node.right;
        }

        return result;
    }
}