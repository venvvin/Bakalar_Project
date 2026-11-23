
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft, FlaskConical, Plus, X, Lock, Unlock,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type Assignment = {
    id: number;
    title: string;
    description: string;
    course_id: number;
};

type TestCase = {
    id: number;
    assignment_id: number;
    input_data: string;
    expected_output: string;
    points: number;
    is_hidden: boolean;
};

type Course = {
    id: number;
    teacher_id: number;
};

export default function AssignmentDetail() {
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [tests, setTests] = useState<TestCase[]>([]);
    const [canManageTests, setCanManageTests] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [inputData, setInputData] = useState("");
    const [expectedOutput, setExpectedOutput] = useState("");
    const [points, setPoints] = useState(1);
    const [isHidden, setIsHidden] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    useEffect(() => {
        if (!assignmentId) {
            setError("Neplatné ID zadania.");
            setLoading(false);
            return;
        }

        let active = true;
        setLoading(true);
        setError("");

        async function load() {
            try {
                const { data: a } = await api.get<Assignment>(
                    `/assignments/${assignmentId}`
                );
                if (!active) return;
                setAssignment(a);

                if (user?.role === "TEACHER") {
                    const { data: course } = await api.get<Course>(
                        `/courses/${a.course_id}`
                    );
                    if (!active) return;

                    const owner = course.teacher_id === user.id;
                    setCanManageTests(owner);

                    if (owner) {
                        const { data: cases } = await api.get<TestCase[]>(
                            `/assignments/${assignmentId}/tests`
                        );
                        if (active) setTests(cases);
                    }
                } else {
                    setCanManageTests(false);
                    setTests([]);
                }
            } catch {
                if (active) setError("Nepodarilo sa načítať zadanie.");
            } finally {
                if (active) setLoading(false);
            }
        }

        void load();
        return () => { active = false; };
    }, [assignmentId, user?.id, user?.role]);

    async function createTest(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!canManageTests || !assignmentId ||
            !expectedOutput.trim() || !Number.isInteger(points) || points < 0) {
            return;
        }

        setCreating(true);
        setCreateError("");

        try {
            const { data } = await api.post<TestCase>(
                `/assignments/${assignmentId}/tests`,
                {
                    input_data: inputData,
                    expected_output: expectedOutput,
                    points,
                    is_hidden: isHidden,
                }
            );
            setTests((prev) => [...prev, data]);
            setInputData("");
            setExpectedOutput("");
            setPoints(1);
            setIsHidden(false);
            setShowModal(false);
        } catch {
            setCreateError("Nepodarilo sa vytvoriť test.");
        } finally {
            setCreating(false);
        }
    }

    const totalPoints = tests.reduce((sum, t) => sum + t.points, 0);

    return (
        <div className="ca-app-layout">
            <Sidebar />
            <main className="ca-dashboard-main">
                <div className="ca-page-topline">
          <span className="ca-topline-left">
            <span className="ca-square" /> CODEASSESS / ZADANIE
          </span>
                    <span>DETAIL ZADANIA</span>
                </div>

                {assignment && (
                    <button
                        className="ca-back-link"
                        onClick={() => navigate(`/courses/${assignment.course_id}`)}
                    >
                        <ArrowLeft size={17} /> SPÄŤ NA KURZ
                    </button>
                )}

                {loading ? (
                    <p className="ca-content-pad">Načítavam zadanie...</p>
                ) : error || !assignment ? (
                    <p className="ca-error">{error || "Zadanie neexistuje."}</p>
                ) : (
                    <>
                        <header className="ca-dashboard-header">
                            <div>
                                <p className="ca-eyebrow">
                                    ZADANIE / {String(assignment.id).padStart(3, "0")}
                                </p>
                                <h1>{assignment.title}<span className="ca-period">.</span></h1>
                            </div>
                        </header>

                        <section className="ca-panel ca-detail-panel">
                            <div className="ca-panel-top">
                                <span>01 / ZNENIE ZADANIA</span>
                                <span>README</span>
                            </div>
                            <div className="ca-content-pad ca-assignment-description">
                                {assignment.description}
                            </div>
                        </section>

                        {canManageTests && (
                            <section className="ca-panel ca-detail-panel">
                                <div className="ca-panel-top">
                                    <span>02 / TESTOVACIE PRÍPADY</span>
                                    <FlaskConical size={18} />
                                </div>

                                <div className="ca-section-toolbar">
                                    <div>
                                        <h2>Testovanie<span className="ca-period">.</span></h2>
                                        <p className="ca-muted">
                                            {tests.length} testov / {totalPoints} bodov
                                        </p>
                                    </div>
                                    <button
                                        className="ca-button"
                                        onClick={() => setShowModal(true)}
                                    >
                                        <Plus size={17} /> NOVÝ TEST
                                    </button>
                                </div>

                                {tests.length === 0 ? (
                                    <div className="ca-empty-state">
                                        <FlaskConical size={30} />
                                        <h3>Zatiaľ žiadne testy</h3>
                                    </div>
                                ) : (
                                    <div className="ca-tests-list">
                                        {tests.map((test, index) => (
                                            <article key={test.id} className="ca-test-card">
                                                <div className="ca-test-heading">
                                                    <strong>TEST / {String(index + 1).padStart(2, "0")}</strong>
                                                    <div className="ca-test-tags">
                                                        <span className="ca-badge">{test.points} BODOV</span>
                                                        <span className="ca-badge">
                              {test.is_hidden
                                  ? <><Lock size={12} /> SKRYTÝ</>
                                  : <><Unlock size={12} /> VEREJNÝ</>}
                            </span>
                                                    </div>
                                                </div>

                                                <div className="ca-test-grid">
                                                    <div>
                                                        <p className="ca-label">INPUT / STDIN</p>
                                                        <pre className="ca-code-block">
                              {test.input_data || "(prázdny vstup)"}
                            </pre>
                                                    </div>
                                                    <div>
                                                        <p className="ca-label">EXPECTED / STDOUT</p>
                                                        <pre className="ca-code-block">
                              {test.expected_output}
                            </pre>
                                                    </div>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}

                        {!canManageTests && (
                            <section className="ca-panel ca-detail-panel">
                                <div className="ca-panel-top">02 / INFORMÁCIE</div>
                                <div className="ca-content-pad">
                                    <p className="ca-muted">
                                        Testovacie prípady nie sú v tomto zobrazení dostupné.
                                    </p>
                                </div>
                            </section>
                        )}
                    </>
                )}

                {showModal && canManageTests && (
                    <div className="ca-modal-overlay">
                        <div
                            className="ca-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="test-dialog-title"
                        >
                            <div className="ca-modal-top">
                                <span>03 / NOVÝ TEST</span>
                                <button
                                    type="button"
                                    disabled={creating}
                                    onClick={() => setShowModal(false)}
                                    aria-label="Zavrieť"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="ca-modal-content">
                                <h2 id="test-dialog-title">
                                    Vytvoriť test<span className="ca-period">.</span>
                                </h2>
                                <form onSubmit={createTest}>
                                    <label className="ca-label" htmlFor="test-input">
                                        VSTUP / STDIN
                                    </label>
                                    <textarea
                                        id="test-input"
                                        className="ca-input"
                                        rows={5}
                                        value={inputData}
                                        onChange={(e) => setInputData(e.target.value)}
                                        placeholder="MKDIR /docs"
                                    />

                                    <label className="ca-label" htmlFor="test-output">
                                        OČAKÁVANÝ VÝSTUP / STDOUT
                                    </label>
                                    <textarea
                                        id="test-output"
                                        className="ca-input"
                                        rows={5}
                                        required
                                        value={expectedOutput}
                                        onChange={(e) => setExpectedOutput(e.target.value)}
                                        placeholder="DIRECTORY_CREATED"
                                    />

                                    <label className="ca-label" htmlFor="test-points">
                                        POČET BODOV
                                    </label>
                                    <input
                                        id="test-points"
                                        type="number"
                                        min={0}
                                        step={1}
                                        className="ca-input"
                                        value={points}
                                        onChange={(e) => setPoints(Number(e.target.value))}
                                    />

                                    <label className="ca-checkbox-row">
                                        <input
                                            type="checkbox"
                                            checked={isHidden}
                                            onChange={(e) => setIsHidden(e.target.checked)}
                                        />
                                        SKRYTÝ TEST
                                    </label>

                                    {createError && <p className="ca-error">{createError}</p>}

                                    <div className="ca-modal-actions">
                                        <button
                                            type="button"
                                            className="ca-button ca-button-secondary"
                                            disabled={creating}
                                            onClick={() => setShowModal(false)}
                                        >
                                            ZRUŠIŤ
                                        </button>
                                        <button
                                            type="submit"
                                            className="ca-button"
                                            disabled={
                                                creating ||
                                                !expectedOutput.trim() ||
                                                !Number.isInteger(points) ||
                                                points < 0
                                            }
                                        >
                                            {creating ? "UKLADANIE..." : "VYTVORIŤ TEST"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}