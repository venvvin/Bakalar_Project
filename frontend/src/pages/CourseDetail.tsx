
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, BookOpen, Plus, X } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type Course = {
    id: number;
    name: string;
    description: string | null;
    teacher_id: number;
};

type Assignment = {
    id: number;
    title: string;
    description: string;
    course_id: number;
};

export default function CourseDetail() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [course, setCourse] = useState<Course | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    useEffect(() => {
        if (!courseId) {
            setError("Neplatné ID kurzu.");
            setLoading(false);
            return;
        }

        setLoading(true);
        Promise.all([
            api.get<Course>(`/courses/${courseId}`),
            api.get<Assignment[]>(`/courses/${courseId}/assignments`),
        ])
            .then(([c, a]) => {
                setCourse(c.data);
                setAssignments(a.data);
            })
            .catch(() => setError("Nepodarilo sa načítať kurz."))
            .finally(() => setLoading(false));
    }, [courseId]);

    const isOwner = user?.role === "TEACHER" &&
        course?.teacher_id === user.id;

    async function createAssignment(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!isOwner || !courseId || !title.trim() || !description.trim()) return;

        setCreating(true);
        setCreateError("");

        try {
            const { data } = await api.post<Assignment>("/assignments", {
                title: title.trim(),
                description: description.trim(),
                course_id: Number(courseId),
            });
            setAssignments((prev) => [...prev, data]);
            setTitle("");
            setDescription("");
            setShowModal(false);
        } catch {
            setCreateError("Nepodarilo sa vytvoriť zadanie.");
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className="ca-app-layout">
            <Sidebar />
            <main className="ca-dashboard-main">
                <div className="ca-page-topline">
          <span className="ca-topline-left">
            <span className="ca-square" /> CODEASSESS / KURZY
          </span>
                    <span>DETAIL KURZU</span>
                </div>

                <button className="ca-back-link" onClick={() => navigate("/courses")}>
                    <ArrowLeft size={17} /> SPÄŤ NA KURZY
                </button>

                {loading ? (
                    <p>Načítavam kurz...</p>
                ) : error || !course ? (
                    <p className="ca-error">{error || "Kurz neexistuje."}</p>
                ) : (
                    <>
                        <header className="ca-dashboard-header">
                            <div>
                                <p className="ca-eyebrow">KURZ / {String(course.id).padStart(3, "0")}</p>
                                <h1>{course.name}<span className="ca-period">.</span></h1>
                                <p className="ca-dashboard-description">
                                    {course.description || "Kurz nemá popis."}
                                </p>
                            </div>
                            <div className="ca-dashboard-mode">
                                <span>POČET ZADANÍ</span>
                                <strong>{assignments.length}</strong>
                            </div>
                        </header>

                        <section className="ca-panel ca-list-panel">
                            <div className="ca-panel-top">
                                <span>01 / ZADANIA KURZU</span>
                                <BookOpen size={18} />
                            </div>

                            <div className="ca-section-toolbar">
                                <div>
                                    <h2>Programovacie zadania</h2>
                                    <p className="ca-muted">Všetky zadania v tomto kurze.</p>
                                </div>
                                {isOwner && (
                                    <button
                                        className="ca-button"
                                        onClick={() => setShowModal(true)}
                                    >
                                        <Plus size={17} /> NOVÉ ZADANIE
                                    </button>
                                )}
                            </div>

                            {assignments.length === 0 ? (
                                <div className="ca-empty-state">
                                    <BookOpen size={30} />
                                    <h3>Zatiaľ žiadne zadania</h3>
                                </div>
                            ) : assignments.map((a, index) => (
                                <button
                                    type="button"
                                    key={a.id}
                                    className="ca-list-row"
                                    onClick={() => navigate(`/assignments/${a.id}`)}
                                >
                  <span className="ca-row-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                                    <span className="ca-row-content">
                    <strong>{a.title}</strong>
                    <span className="ca-row-description">{a.description}</span>
                  </span>
                                    <ArrowUpRight className="ca-row-arrow" size={22} />
                                </button>
                            ))}
                        </section>
                    </>
                )}

                {showModal && isOwner && (
                    <div className="ca-modal-overlay">
                        <div
                            className="ca-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="assignment-dialog"
                        >
                            <div className="ca-modal-top">
                                <span>02 / NOVÉ ZADANIE</span>
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
                                <h2 id="assignment-dialog">Vytvoriť zadanie<span className="ca-period">.</span></h2>
                                <form onSubmit={createAssignment}>
                                    <label className="ca-label" htmlFor="assignment-title">
                                        NÁZOV ZADANIA
                                    </label>
                                    <input
                                        id="assignment-title"
                                        className="ca-input"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        maxLength={255}
                                        placeholder="Virtuálny súborový systém"
                                        required
                                    />

                                    <label className="ca-label" htmlFor="assignment-desc">
                                        POPIS ZADANIA
                                    </label>
                                    <textarea
                                        id="assignment-desc"
                                        className="ca-input"
                                        rows={7}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Podrobné zadanie..."
                                        required
                                    />

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
                                            disabled={creating || !title.trim() || !description.trim()}
                                        >
                                            {creating ? "UKLADANIE..." : "VYTVORIŤ ZADANIE"}
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