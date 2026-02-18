import { useEffect, useRef, useState } from "react";
import CRDTDocument from "../crdt/CRDTDocument";
import { connectSocket, sendMessage } from "../websocket/socket";
import { useParams, useNavigate } from "react-router-dom";



export default function Editor() {

    const crdtRef = useRef(new CRDTDocument());
    const [text, setText] = useState("");
    const { docId } = useParams();
    const userId = "user - " + Math.floor(Math.random() * 1000);
    const navigate = useNavigate();
    const [showToast, setShowToast] = useState(false);
    const lastSeenSyncIndex = useRef(null);

    const createDoc = () => {
        const newDocId = crypto.randomUUID();
        navigate(`/doc/${newDocId}`);
    };



    useEffect(() => {
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
            crdtRef.current.head = state.head;
            lastSeenSyncIndex.current = syncIndex;
            setText(crdtRef.current.toString());
        }


        if (data.action === "REMOTE_OP") {
            const { op, syncIndex } = data;
            if (op.type === "insert") {
                crdtRef.current.insert(op);
            }
            else {
                crdtRef.current.delete(op.targetId);
            }
            lastSeenSyncIndex.current = syncIndex;

            setText(crdtRef.current.toString());
        }

        if (data.action === "SNAPSHOT_SYNC") {
            const { snapshot, ops, snapshotSyncIndex } = data;
            lastSeenSyncIndex.current = snapshotSyncIndex;
            crdtRef.current.nodes = new Map(snapshot.nodes);
            crdtRef.current.head = snapshot.head;

            for (const item of ops) {
                const { op, syncIndex } = item;
                if (op.type === "insert") {
                    crdtRef.current.insert(op);
                } else {
                    crdtRef.current.delete(op.targetId);
                }
                lastSeenSyncIndex.current = syncIndex;
            }

            setText(crdtRef.current.toString());
        }


        if (data.action === "OP_REPLAY") {
            const { ops, syncIndex } = data;

            for (const op of ops) {
                if (op.type === "insert") {
                    crdtRef.current.insert(op);
                } else {
                    crdtRef.current.delete(op.targetId);
                }

                lastSeenSyncIndex.current = syncIndex;
            }

            setText(crdtRef.current.toString());
        }


    }
    const getNodeAtIndex = (index) => {
        let current = crdtRef.current.head;
        let count = 0;
        let previousVisible;

        while (current) {
            const node = crdtRef.current.nodes.get(current);
            if (!node.deleted) {
                if (count == index) {
                    return previousVisible;
                }
                previousVisible = node;
                count++;
            }
            current = node.right;
        }
        return previousVisible;
    }


    const handleChange = (e) => {
        const newText = e.target.value;
        const oldText = text;

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


        for (let i = 0; i < deletedCount; i++) {
            deleteAtIndex(diffStart);
        }

        for (let i = 0; i < insertedText.length; i++) {
            insertAtIndex(diffStart + i, insertedText[i]);
        }

        setText(crdtRef.current.toString());
    }

    const insertAtIndex = (index, char) => {
        console.log(char);
        const id = `${userId}-${Date.now()}-${Math.random()}`;

        const leftNode = getNodeAtIndex(index);

        const op = {
            id,
            type: "insert",
            char,
            left: leftNode ? leftNode.id : null,
        };
        crdtRef.current.insert(op);
        sendMessage({
            action: "SEND_OP",
            docId,
            op,
        });
    };
    const deleteAtIndex = (index) => {
        let current = crdtRef.current.head;
        let count = 0;

        while (current) {
            const node = crdtRef.current.nodes.get(current);

            if (!node.deleted) {
                if (count === index) {
                    crdtRef.current.delete(node.id);
                    const op = {
                        id: `${userId}-${Date.now()}-${Math.random()}`,
                        type: "delete",
                        targetId: node.id,
                    }
                    sendMessage({
                        action: "SEND_OP",
                        docId,
                        op,
                    });
                    break;
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

