import CRDTDocument from "../frontend/src/crdt/CRDTDocument.js";

function randomId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random()}`;
}

const original = new CRDTDocument();

const operations = [];

let lastLeft = null;

// Generate 100 random inserts
for (let i = 0; i < 100; i++) {

    const op = {
        id: randomId(`U${i}`),
        char: String.fromCharCode(65 + (i % 26)),
        left: lastLeft,
    };

    operations.push(op);

    original.insert(op);

    lastLeft = op.id;
}

// Create snapshot at op 50
const snapshotDoc = new CRDTDocument();

for (let i = 0; i < 50; i++) {
    snapshotDoc.insert(operations[i]);
}

const snapshot = {
    nodes: Array.from(snapshotDoc.nodes.entries()),
    head: snapshotDoc.head,
};

// Recovery client
const recovered = new CRDTDocument();

recovered.nodes = new Map(snapshot.nodes);
recovered.head = snapshot.head;

// Replay remaining ops
for (let i = 50; i < operations.length; i++) {
    recovered.insert(operations[i]);
}

const originalState = original.toString();
const recoveredState = recovered.toString();

console.log("Original Length:", originalState.length);
console.log("Recovered Length:", recoveredState.length);

console.log(
    "Converged:",
    originalState === recoveredState
);

if (originalState !== recoveredState) {
    console.log(originalState);
    console.log(recoveredState);
}