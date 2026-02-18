import { useNavigate } from "react-router-dom";

export default function Home() {
    const navigate = useNavigate();

    const createDoc = () => {
        const newDocId = crypto.randomUUID();
        navigate(`/doc/${newDocId}`);
    };

    return (
        <div className="homebox">
            <div className="navbar">
                <div className="logo">
                    <img src="logo.png" alt="logo" />
                </div>
                <div className="btns">
                    <button className="createdoc" onClick={createDoc}>+ Create Doc</button>
                </div>
            </div>
            <div className="a">
                <div className="a1">
                    <img className="illustrationimg" src="illus.png" alt="illustration" />
                </div>
                <div className="a2">

                    <h1>Write together, in real time.</h1>
                    <h3>A fast, collaborative editor that lets you create, share, <br />and edit documents instantly with others — no refresh, no delays.</h3>
                    <button className="createdocdark" onClick={createDoc}>
                        Create New Document
                      </button>
                
                </div>
            </div>
        </div>
    );
}
