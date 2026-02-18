import "../src/App.css";
import { Routes, Route } from "react-router-dom";
import Editor from "./components/Editor";
import Home from "./components/Home";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/doc/:docId" element={<Editor />} />
    </Routes>
  );
}
