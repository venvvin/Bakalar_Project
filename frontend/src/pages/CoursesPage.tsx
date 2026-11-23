
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, BookOpen, Plus, X } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type Course = {
    id: number;
    name: string;
    description: string | null;
    teacher_id: number;
};

export default function CoursesPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    useEffect(() => {
        api.get<Course[]>("/courses")
            .then(({ data }) => setCourses(data))
            .catch(() => setError("Nepodarilo sa načítať kurzy."))
            .finally(() => setLoading(false));
    }, []);

    async function createCourse(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!name.trim() || !user || user.role !== "TEACHER") return;

        setCreating(true);
        setCreateError("");

        try {
            const { data } = await api.post<Course>("/courses", {
                name: name.trim(),
                description: description.trim() || null,
                teacher_id: user.id,
            });

            setCourses((prev) => [...prev, data]);
            setName("");
            setDescription("");
            setShowModal(false);
        } catch {
            setCreateError("Nepodarilo sa vytvoriť kurz.");
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
            <span className="ca-square" />
            CODEASSESS / KURZY
          </span>
                    <span>COURSE MANAGEMENT / 02</span>
                </div>

                <header className="ca-dashboard-header">
                    <div>
                        <p className="ca-eyebrow">02 / VZDELÁVANIE</p>
                        <h1>Moje kurzy<span className="ca-period">.</span></h1>
                        <p className="ca-dashboard-description">
                            Prehľad kurzov a správa programovacích zadaní.
                        </p>
                    </div>

                    <div className="ca-dashboard-mode">
                        <span>POČET KURZOV</span>
                        <strong>{courses.length}</strong>
                    </div>
                </header>

                <section className="ca-dashboard-section">
                    <div className="ca-section-heading">
                        <div>
                            <p className="ca-eyebrow">01 / ZOZNAM KURZOV</p>
                            <h2>Kurzy<span className="ca-period">.</span></h2>
                        </div>

                        {user?.role === "TEACHER" && (
                            <button
                                className="ca-button"
                                onClick={() => setShowModal(true)}
                            >
                                <Plus size={18} /> NOVÝ KURZ
                            </button>
                        )}
                    </div>

                    {loading && <p className="ca-muted">Načítavam kurzy...</p>}
                    {error && <p className="ca-error" role="alert">{error}</p>}

                    {!loading && !error && courses.length === 0 && (
                        <div className="ca-empty-state">
                            <BookOpen size={35} />
                            <h3>Zatiaľ žiadne kurzy</h3>
                            <p>
                                {user?.role === "TEACHER"
                                    ? "Vytvorte svoj prvý kurz."
                                    : "Zatiaľ nie ste zapísaný do žiadneho kurzu."}
                            </p>
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="ca-course-grid">
                            {courses.map((course, index) => (
                                <button
                                    key={course.id}
                                    type="button"
                                    className="ca-course-card"
                                    onClick={() => navigate(`/courses/${course.id}`)}
                                >
                                    <div className="ca-course-card-top">
                                        <span>KURZ / {String(index + 1).padStart(2, "0")}</span>
                                        <ArrowUpRight size={21} />
                                    </div>

                                    <div className="ca-course-card-content">
                                        <BookOpen size={29} strokeWidth={1.5} />
                                        <h3>{course.name}</h3>
                                        <p>{course.description || "Bez popisu"}</p>
                                    </div>

                                    <div className="ca-course-card-bottom">
                                        <span>COURSE ID / {course.id}</span>
                                        <span>OTVORIŤ ↗</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {showModal && user?.role === "TEACHER" && (
                <div className="ca-modal-overlay">
                    <div
                        className="ca-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="new-course-title"
                    >
                        <div className="ca-modal-top">
                            <span>03 / NOVÝ KURZ</span>
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
                            <h2 id="new-course-title">
                                Vytvoriť kurz<span className="ca-period">.</span>
                            </h2>

                            <form onSubmit={createCourse}>
                                <label className="ca-label" htmlFor="course-name">
                                    NÁZOV KURZU *
                                </label>
                                <input
                                    id="course-name"
                                    className="ca-input"
                                    required
                                    maxLength={255}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Programovanie 2"
                                />

                                <label className="ca-label" htmlFor="course-description">
                                    POPIS KURZU
                                </label>
                                <textarea
                                    id="course-description"
                                    className="ca-input"
                                    rows={4}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Popis kurzu..."
                                />

                                {createError && (
                                    <p className="ca-error" role="alert">{createError}</p>
                                )}

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
                                        disabled={creating || !name.trim()}
                                    >
                                        {creating ? "UKLADANIE..." : "VYTVORIŤ KURZ"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
