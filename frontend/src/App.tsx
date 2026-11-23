
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowUpRight,
    BookOpen,
    ClipboardList,
    Code2,
    ShieldCheck,
    BrainCircuit,
    Terminal,
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import { api } from "./api/client";
import { useAuth } from "./auth/AuthContext";

type Course = {
    id: number;
    name: string;
};

type Assignment = {
    id: number;
    title: string;
    course_id: number;
};

export default function App() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [courses, setCourses] = useState<Course[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        let active = true;

        async function load() {
            const [courseResult, assignmentResult] = await Promise.allSettled([
                api.get<Course[]>("/courses"),
                api.get<Assignment[]>("/assignments"),
            ]);

            if (!active) return;

            const messages: string[] = [];

            if (courseResult.status === "fulfilled") {
                setCourses(courseResult.value.data);
            } else {
                messages.push("Nepodarilo sa načítať kurzy.");
            }

            if (assignmentResult.status === "fulfilled") {
                setAssignments(assignmentResult.value.data);
            } else {
                messages.push("Nepodarilo sa načítať zadania.");
            }

            setErrors(messages);
            setLoading(false);
        }

        void load();

        return () => {
            active = false;
        };
    }, []);

    const features = [
        {
            icon: Code2,
            number: "01",
            title: "Odovzdávanie riešení",
            description: "Správa programovacích zadaní a študentských riešení.",
        },
        {
            icon: ShieldCheck,
            number: "02",
            title: "Automatické testovanie",
            description: "Vyhodnocovanie riešení pomocou testovacích prípadov.",
        },
        {
            icon: BrainCircuit,
            number: "03",
            title: "Analýza kódu",
            description: "Plánovaná podpora AI spätnej väzby a analýzy podobnosti.",
        },
    ];

    return (
        <div className="ca-app-layout">
            <Sidebar />

            <main className="ca-dashboard-main ca-home">
                <div className="ca-page-topline">
          <span className="ca-topline-left">
            <span className="ca-square" />
            CODEASSESS / DASHBOARD
          </span>
                    <span>SYSTEM OVERVIEW / 01</span>
                </div>

                <section className="ca-home-hero">
                    <div className="ca-home-hero-content">
                        <p className="ca-home-kicker">
                            <span className="ca-live-dot" />
                            ACADEMIC PROGRAMMING PLATFORM
                        </p>

                        <h1>
                            CODE<span>.</span>
                            <br />
                            TEST<span>.</span>
                            <br />
                            ASSESS<span>.</span>
                        </h1>

                        <p className="ca-home-hero-description">
                            Informačný systém pre odovzdávanie a automatizované
                            hodnotenie riešení z programovania.
                        </p>

                        <button
                            className="ca-home-primary"
                            onClick={() => navigate("/courses")}
                        >
                            PREJSŤ NA KURZY
                            <ArrowUpRight size={20} />
                        </button>
                    </div>

                    <div className="ca-home-visual" aria-hidden="true">
                        <div className="ca-home-terminal">
                            <div className="ca-home-terminal-top">
                                <span>CODEASSESS / SYSTEM</span>
                                <Terminal size={17} />
                            </div>
                            <div className="ca-home-terminal-body">
                                <p><span>$</span> codeassess --status</p>
                                <p className="ca-terminal-ok">[OK] PLATFORM READY</p>
                                <p className="ca-terminal-muted">
                                    &gt; Courses: {courses.length}
                                </p>
                                <p className="ca-terminal-muted">
                                    &gt; Assignments: {assignments.length}
                                </p>
                                <p className="ca-terminal-accent">
                                    &gt; Welcome to CodeAssess_
                                    <span className="ca-terminal-cursor">█</span>
                                </p>
                            </div>
                        </div>

                        <div className="ca-home-orbit">
                            <div className="ca-orbit-ring ca-orbit-ring-one" />
                            <div className="ca-orbit-ring ca-orbit-ring-two" />
                            <Code2 size={58} strokeWidth={1.2} />
                        </div>
                    </div>
                </section>

                <section className="ca-home-welcome">
                    <div>
                        <p className="ca-eyebrow">01 / VITAJTE</p>
                        <h2>
                            Vitajte v CodeAssess<span className="ca-period">.</span>
                        </h2>
                        <p>
                            {user?.full_name
                                ? `Prihlásený používateľ: ${user.full_name}`
                                : "Váš pracovný priestor"}
                        </p>
                    </div>
                    <span className="ca-home-role">
            {user?.role === "TEACHER" ? "TEACHER MODE" : "STUDENT MODE"}
          </span>
                </section>

                <section className="ca-home-statistics">
                    <div className="ca-home-section-label">
                        <span>02 / ŠTATISTIKY</span>
                        <span>AKTUÁLNY PREHĽAD</span>
                    </div>

                    <div className="ca-home-stats">
                        <button
                            className="ca-home-stat"
                            onClick={() => navigate("/courses")}
                        >
                            <div className="ca-home-stat-header">
                                <span>01 / KURZY</span>
                                <BookOpen size={23} />
                            </div>
                            <strong>{loading ? "..." : errors.includes("Nepodarilo sa načítať kurzy.") ? "—" : courses.length}</strong>
                            <div className="ca-home-stat-footer">
                                <span>MOJE KURZY</span>
                                <ArrowUpRight size={19} />
                            </div>
                        </button>

                        <button
                            className="ca-home-stat"
                            onClick={() => navigate("/assignments")}
                        >
                            <div className="ca-home-stat-header">
                                <span>02 / ZADANIA</span>
                                <ClipboardList size={23} />
                            </div>
                            <strong>{loading ? "..." : errors.includes("Nepodarilo sa načítať zadania.") ? "—" : assignments.length}</strong>
                            <div className="ca-home-stat-footer">
                                <span>PROGRAMOVACIE ÚLOHY</span>
                                <ArrowUpRight size={19} />
                            </div>
                        </button>
                    </div>

                    {errors.map((message) => (
                        <p key={message} className="ca-error" role="alert">
                            {message}
                        </p>
                    ))}
                </section>

                <section className="ca-home-features">
                    <div className="ca-home-section-label">
                        <span>03 / FUNKCIONALITA</span>
                        <span>CODEASSESS PLATFORM</span>
                    </div>

                    <h2>
                        Jeden systém.
                        <br />
                        Viac možností<span className="ca-period">.</span>
                    </h2>

                    <div className="ca-home-features-grid">
                        {features.map(({ icon: Icon, number, title, description }) => (
                            <article className="ca-home-feature" key={number}>
                                <div className="ca-home-feature-top">
                                    <span>{number} / MODULE</span>
                                    <Icon size={27} strokeWidth={1.5} />
                                </div>
                                <h3>{title}</h3>
                                <p>{description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <footer className="ca-dashboard-footer">
                    <span>CODEASSESS / STU</span>
                    <span>BAKALÁRSKA PRÁCA · 2026</span>
                </footer>
            </main>
        </div>
    );
}
