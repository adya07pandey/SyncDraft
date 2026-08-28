import { useEffect, useRef, useState } from "react";
import CRDTDocument from "../crdt/CRDTDocument";
import { connectSocket, sendMessage } from "../websocket/socket";
import { useParams, useNavigate } from "react-router-dom";
import VectorClock from "../crdt/VectorClock.js";


export default function Editor() {

    const crdtRef = useRef(new CRDTDocument());
    const [text, setText] = useState("");
    const { docId } = useParams();
    const userId = useRef(crypto.randomUUID()).current;
    const navigate = useNavigate();
    const [showToast, setShowToast] = useState(false);
    const lastSeenSyncIndex = useRef(null);


    const createDoc = () => {
        const newDocId = crypto.randomUUID();
        navigate(`/doc/${newDocId}`);
    };

    const vectorClockRef = useRef(
        new VectorClock(userId)
    );

    useEffect(() => {

        vectorClockRef.current = new VectorClock(userId);
        crdtRef.current = new CRDTDocument();

        lastSeenSyncIndex.current = 0;
        setText("");
        connectSocket(
            handleServerMessage,
            () => {
                sendMessage({
                    action: "JOIN_DOC",
                    docId,
                    userId,
                });
                setTimeout(() => {
                    sendMessage({
                        action: "SYNC_STATE",
                        docId,
                        lastSeenSyncIndex: lastSeenSyncIndex.current ?? 0
                    });
                }, 200);

            }
        );

    }, [docId]);



    const handleServerMessage = (data) => {
        
        if (data.action === "DOC_STATE") {

            const { state, syncIndex } = data;

            crdtRef.current.nodes = new Map(state.nodes);
            crdtRef.current.head = "head";
            crdtRef.current.ensureHead();

            lastSeenSyncIndex.current = syncIndex;

            requestAnimationFrame(() => {
                setText(crdtRef.current.toString());
            });
        }

        if (data.action === "REMOTE_OP") {
            const { op, syncIndex } = data;
            // console.log(op);

            const latency = Date.now() - op.sentAt;
            // console.log("Latency:", latency);

            vectorClockRef.current.merge(op.vectorClock);

            if (op.type === "insert") {
                crdtRef.current.insert(op);
            }
            else {
                crdtRef.current.delete(op.targetId);
            }
            lastSeenSyncIndex.current = syncIndex;

            requestAnimationFrame(() => {
                setText(crdtRef.current.toString());
            });
        }

        if (data.action === "SNAPSHOT_SYNC") {

            const { snapshot, ops, snapshotSyncIndex } = data;

            crdtRef.current.nodes = new Map(snapshot.nodes);
            crdtRef.current.head = "head";
            crdtRef.current.ensureHead();

            lastSeenSyncIndex.current = snapshotSyncIndex;

            for (const item of ops) {

                const { op, syncIndex } = item;

                vectorClockRef.current.merge(op.vectorClock);

                if (op.type === "insert") {
                    crdtRef.current.insert(op);
                }
                else {
                    crdtRef.current.delete(op.targetId);
                }

                lastSeenSyncIndex.current = syncIndex;
            }

            requestAnimationFrame(() => {
                setText(crdtRef.current.toString());
            });
        }

        if (data.action === "OP_REPLAY") {
            const { ops, syncIndex } = data;

            for (const op of ops) {
                vectorClockRef.current.merge(op.vectorClock);

                if (op.type === "insert") {
                    crdtRef.current.insert(op);
                }
                else {
                    crdtRef.current.delete(op.targetId);
                }

                lastSeenSyncIndex.current = syncIndex;
            }

            requestAnimationFrame(() => {
                setText(crdtRef.current.toString());
            });
        }


    }
    const getNodeAtIndex = (index) => {

        let current = crdtRef.current.nodes.get(crdtRef.current.head).right;
        let previous = crdtRef.current.nodes.get(crdtRef.current.head);
        let count = 0;

        while (current) {
            // console.log(previous.char);

            const node = crdtRef.current.nodes.get(current);

            if (!node) break;

            if (!node.deleted) {

                if (count === index) {
                    return previous;
                }

                previous = node;
                count++;
            }
            current = node.right;
        }

        return previous;
    };


    const handleChange = (e) => {

        const newText = e.target.value;
        const oldText = crdtRef.current.toString();
        // console.log("oldtext - ", oldText);
        // console.log("newtext - ", newText);
        
        const start = e.target.selectionStart;

        let diffStart = 0;
        while (
            diffStart < oldText.length &&
            diffStart < newText.length &&
            oldText[diffStart] === newText[diffStart]
        ) {
            diffStart++;
        }

        let oldEnd = oldText.length - 1;
        let newEnd = newText.length - 1;

        while (
            oldEnd >= diffStart &&
            newEnd >= diffStart &&
            oldText[oldEnd] === newText[newEnd]
        ) {
            oldEnd--;
            newEnd--;
        }

        const deletedCount = oldEnd - diffStart + 1;
        const insertedText = newText.slice(diffStart, newEnd + 1);
        // console.log("insertedText- ", newText.slice(diffStart, newEnd + 1));

        for (let i = 0; i < deletedCount; i++) {
            deleteAtIndex(diffStart);
        }

        for (let i = 0; i < insertedText.length; i++) {
            insertAtIndex(diffStart + i, insertedText[i]);
        }

        setText(newText);
        // console.log("text- ",text);
    }

    const insertAtIndex = (index, char) => {

        const id =
            `${userId}-${Date.now()}-${performance.now()}-${crypto.randomUUID()}`;

        const leftNode = getNodeAtIndex(index);

        // console.log(
        //     "insert:",
        //     char,
        //     "index:",
        //     index,
        //     "left:",
        //     leftNode?.id
        // );

        vectorClockRef.current.increment();

        const op = {
            id,
            type: "insert",
            char,
            left: leftNode ? leftNode.id : "head",

            vectorClock: vectorClockRef.current.get(),

            sentAt: Date.now(),
        };
        // console.log(op);
        crdtRef.current.insert(op);

        sendMessage({
            action: "SEND_OP",
            docId,
            op,
        });
    };

    const deleteAtIndex = (index) => {

        let current = crdtRef.current.nodes.get(crdtRef.current.head).right;
        let count = 0;

        while (current) {

            const node = crdtRef.current.nodes.get(current);

            if (!node) break;

            if (!node.deleted) {

                if (count === index) {

                    crdtRef.current.delete(node.id);
                    vectorClockRef.current.increment();

                    const op = {
                        id: `${userId}-${Date.now()}-${performance.now()}-${crypto.randomUUID()}`,
                        type: "delete",
                        targetId: node.id,
                        vectorClock: vectorClockRef.current.get(),
                        sentAt: Date.now(),
                    };
                    
                    sendMessage({
                        action: "SEND_OP",
                        docId,
                        op,
                    });

                    return;
                }

                count++;
            }

            current = node.right;
        }
    };

    return (

        <div className="box">
            <div className="navbar">
                <div className="logo" onClick={() => navigate("/")}>
                    <img src="/logo.png" alt="logo" />
                </div>

                <div className="btns">
                    <button className="createdoc" onClick={createDoc}>+ Create Doc</button>
                    <button className="share" onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        setShowToast(true);
                        setTimeout(() => {
                            setShowToast(false);
                        }, 2000);
                    }}>Share</button>
                </div>
            </div>

            <div className="doc">

                <textarea
                    value={text}
                    onChange={handleChange}
                    style={{
                        width: "100%",
                        height: "400px",
                        fontSize: "18px",
                    }}
                />
            </div>

            {showToast && (
                <div className="toast">
                    Link copied to clipboard!
                </div>
            )}

        </div>
    );
}

