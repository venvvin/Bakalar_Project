import { lazy, Suspense, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, Clock3, FileCode2, FileUp, History, RotateCcw, Send } from "lucide-react";
import axios from "axios";
import { api } from "../api/client";

const CodeEditor = lazy(() => import("./CodeEditor"));

type Submission = {
    id: number;
    assignment_id: number;
    code: string;
    status: string;
    submitted_at: string;
};

const MAX_FILE_BYTES = 1_000_000;
const languages = [
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "cpp", label: "C++" },
    { value: "c", label: "C" },
    { value: "csharp", label: "C#" },
    { value: "go", label: "Go" },
    { value: "plaintext", label: "Text" },
];

function failureMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        if (typeof detail === "string") return detail;
    }
    return "Operácia sa nepodarila. Skúste to, prosím, znova.";
}

export default function SubmissionsPanel({ assignmentId }: { assignmentId: number }) {
    const [mode, setMode] = useState<"editor" | "file">("editor");
    const [language, setLanguage] = useState("python");
    const [code, setCode] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const [history, setHistory] = useState<Submission[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [historyError, setHistoryError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [success, setSuccess] = useState("");
    const codeTooLarge = new Blob([code]).size > MAX_FILE_BYTES;

    useEffect(() => {
        let active = true;
        api.get<Submission[]>(`/assignments/${assignmentId}/submissions`)
            .then(({ data }) => { if (active) setHistory(data); })
            .catch(() => {
                if (active) setHistoryError("Históriu odovzdaní sa nepodarilo načítať.");
            })
            .finally(() => { if (active) setLoadingHistory(false); });
        return () => { active = false; };
    }, [assignmentId]);

    function onFileChange(event: ChangeEvent<HTMLInputElement>) {
        const selected = event.target.files?.[0] ?? null;
        setSuccess("");
        setSubmitError("");
        if (selected && selected.size > MAX_FILE_BYTES) {
            setFile(null);
            event.target.value = "";
            setSubmitError("Súbor nesmie presiahnuť 1 MB.");
        } else {
            setFile(selected);
        }
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitting || (mode === "editor" && !code.trim()) || (mode === "file" && !file)) return;

        setSubmitting(true);
        setSubmitError("");
        setSuccess("");
        try {
            const endpoint = `/assignments/${assignmentId}/submissions`;
            let response;
            if (mode === "file") {
                const formData = new FormData();
                formData.append("file", file!);
                response = await api.post<Submission>(`${endpoint}/file`, formData);
            } else {
                response = await api.post<Submission>(endpoint, { code });
            }
            setHistory((previous) => [response.data, ...previous]);
            setHistoryError("");
            setSuccess(`Pokus #${response.data.id} bol úspešne uložený.`);
            if (mode === "file") {
                setFile(null);
                if (fileInput.current) fileInput.current.value = "";
            }
        } catch (error) {
            setSubmitError(failureMessage(error));
        } finally {
            setSubmitting(false);
        }
    }

    function restore(submission: Submission) {
        setCode(submission.code);
        setMode("editor");
        setSubmitError("");
        setSuccess(`Kód z pokusu #${submission.id} je načítaný v editore.`);
    }

    return (
        <>
            <section className="ca-panel ca-detail-panel">
                <div className="ca-panel-top">
                    <span>02 / ODOVZDAŤ RIEŠENIE</span>
                    <FileCode2 size={18} />
                </div>
                <div className="ca-submission-content">
                    <div className="ca-submission-intro">
                        <div>
                            <h2>Vaše riešenie<span className="ca-period">.</span></h2>
                            <p className="ca-muted">Napíšte kód alebo nahrajte súbor. Každé odovzdanie sa uloží ako nový pokus.</p>
                        </div>
                        <span className="ca-submission-limit">MAX. 1 MB</span>
                    </div>

                    <div className="ca-submission-tabs" role="group" aria-label="Spôsob odovzdania">
                        <button type="button" aria-pressed={mode === "editor"}
                            className={mode === "editor" ? "ca-submission-tab active" : "ca-submission-tab"}
                            onClick={() => { setMode("editor"); setSubmitError(""); setSuccess(""); }}>
                            <FileCode2 size={16} /> EDITOR
                        </button>
                        <button type="button" aria-pressed={mode === "file"}
                            className={mode === "file" ? "ca-submission-tab active" : "ca-submission-tab"}
                            onClick={() => { setMode("file"); setSubmitError(""); setSuccess(""); }}>
                            <FileUp size={16} /> NAHRAŤ SÚBOR
                        </button>
                    </div>

                    <form onSubmit={(event) => { void submit(event); }}>
                        {mode === "editor" ? (
                            <div className="ca-editor-shell">
                                <div className="ca-editor-toolbar">
                                    <label htmlFor="submission-language">JAZYK</label>
                                    <select id="submission-language" value={language}
                                        onChange={(event) => setLanguage(event.target.value)}>
                                        {languages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                    </select>
                                    <span>MONACO EDITOR</span>
                                </div>
                                <div className="ca-monaco-area" aria-label="Editor zdrojového kódu">
                                    <Suspense fallback={<p className="ca-editor-loading">Načítavam editor...</p>}>
                                        <CodeEditor language={language} code={code} onChange={setCode} />
                                    </Suspense>
                                </div>
                            </div>
                        ) : (
                            <div className="ca-upload-box">
                                <FileUp size={31} aria-hidden="true" />
                                <label htmlFor="submission-file">VYBERTE SÚBOR SO ZDROJOVÝM KÓDOM</label>
                                <input id="submission-file" ref={fileInput} type="file" onChange={onFileChange} />
                                <p>{file ? `${file.name} · ${(file.size / 1024).toFixed(1)} KB` : "Textový súbor v kódovaní UTF-8, maximálne 1 MB."}</p>
                            </div>
                        )}

                        {mode === "editor" && codeTooLarge && (
                            <p className="ca-error" role="alert">Kód presahuje limit 1 MB.</p>
                        )}
                        {submitError && <p className="ca-error" role="alert">{submitError}</p>}
                        {success && <p className="ca-success" role="status"><Check size={15} /> {success}</p>}
                        <div className="ca-submission-actions">
                            <span>Kód sa uloží, ale zatiaľ sa automaticky nespúšťa.</span>
                            <button type="submit" className="ca-button" disabled={submitting ||
                                (mode === "editor" ? !code.trim() || codeTooLarge : !file)}>
                                <Send size={16} /> {submitting ? "ODOVZDÁVANIE..." : "ODOVZDAŤ RIEŠENIE"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            <section className="ca-panel ca-detail-panel">
                <div className="ca-panel-top">
                    <span>03 / HISTÓRIA POKUSOV</span>
                    <History size={18} />
                </div>
                <div className="ca-submission-content">
                    {loadingHistory ? <p className="ca-muted">Načítavam históriu...</p> :
                        historyError ? <p className="ca-error" role="alert">{historyError}</p> :
                        history.length === 0 ? (
                            <div className="ca-submission-empty"><Clock3 size={28} />
                                <strong>Zatiaľ žiadne pokusy</strong>
                                <p>Prvé odovzdané riešenie sa zobrazí tu.</p>
                            </div>
                        ) : (
                            <div className="ca-submission-history">
                                {history.map((item) => (
                                    <article key={item.id} className="ca-submission-attempt">
                                        <div className="ca-attempt-header">
                                            <div><strong>POKUS #{item.id}</strong>
                                                <time dateTime={item.submitted_at}>
                                                    {new Date(item.submitted_at).toLocaleString("sk-SK")}
                                                </time>
                                            </div>
                                            <span className={`ca-submission-status ${item.status === "PENDING" ? "pending" : item.status === "PASSED" ? "passed" : "other"}`}>
                                                {item.status === "PENDING" ? "ČAKÁ NA HODNOTENIE" : item.status}
                                            </span>
                                        </div>
                                        <pre>{item.code.length > 260 ? `${item.code.slice(0, 260)}…` : item.code}</pre>
                                        <button type="button" className="ca-restore-button" onClick={() => restore(item)}>
                                            <RotateCcw size={15} /> NAČÍTAŤ DO EDITORA
                                        </button>
                                    </article>
                                ))}
                            </div>
                        )}
                </div>
            </section>
        </>
    );
}
