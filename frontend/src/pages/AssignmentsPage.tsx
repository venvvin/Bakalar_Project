
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ClipboardList, BookOpen } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { api } from "../api/client";

type Assignment = {
    id: number;
    title: string;
    description: string;
    course_id: number;
};

type Course = {
    id: number;
    name: string;
    description: string | null;
    teacher_id: number;
};

export default function AssignmentsPage() {
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        Promise.all([
            api.get<Assignment[]>("/assignments"),
            api.get<Course[]>("/courses"),
        ])
            .then(([a, c]) => {
                setAssignments(a.data);
                setCourses(c.data);
            })
            .catch(() => setError("Nepodarilo sa načítať zadania."))
            .finally(() => setLoading(false));
    }, []);

    const courseName = (id: number) =>
        courses.find((course) => course.id === id)?.name ?? "Neznámy kurz";

    return (
        <div className="ca-app-layout">
            <Sidebar />
            <main className="ca-dashboard-main">
                <div className="ca-page-topline">
          <span className="ca-topline-left">
            <span className="ca-square" />
            CODEASSESS / ZADANIA
          </span>
                    <span>PROGRAMOVANIE / 02</span>
                </div>

                <header className="ca-dashboard-header">
                    <div>
                        <p className="ca-eyebrow">02 / PROGRAMOVACIE ÚLOHY</p>
                        <h1>Zadania<span className="ca-period">.</span></h1>
                        <p className="ca-dashboard-description">
                            Prehľad programovacích zadaní vo vašich kurzoch.
                        </p>
                    </div>
                    <div className="ca-dashboard-mode">
                        <span>CELKOVÝ POČET</span>
                        <strong>{assignments.length}</strong>
                    </div>
                </header>

                <section className="ca-panel ca-list-panel">
                    <div className="ca-panel-top">
                        <span>01 / VŠETKY ZADANIA</span>
                        <ClipboardList size={18} />
                    </div>

                    {loading && <p className="ca-content-pad">Načítavam zadania...</p>}
                    {error && <p className="ca-content-pad ca-error">{error}</p>}

                    {!loading && !error && assignments.length === 0 && (
                        <div className="ca-empty-state">
                            <ClipboardList size={32} />
                            <h3>Žiadne zadania</h3>
                            <p>Nové zadanie možno vytvoriť v detaile kurzu.</p>
                        </div>
                    )}

                    {!loading && !error && assignments.map((a, index) => (
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
                <span className="ca-row-meta">
                  <BookOpen size={14} /> {courseName(a.course_id)}
                </span>
                <span className="ca-row-description">{a.description}</span>
              </span>
                            <ArrowUpRight className="ca-row-arrow" size={22} />
                        </button>
                    ))}
                </section>
            </main>
        </div>
    );
}
