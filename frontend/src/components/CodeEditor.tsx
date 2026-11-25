import Editor from "@monaco-editor/react";
import "../monaco";

export default function CodeEditor({
    language,
    code,
    onChange,
}: {
    language: string;
    code: string;
    onChange: (code: string) => void;
}) {
    return (
        <Editor
            height="360px"
            language={language}
            value={code}
            onChange={(value) => onChange(value ?? "")}
            theme="vs-dark"
            options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "on",
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: 4,
                wordWrap: "on",
            }}
        />
    );
}