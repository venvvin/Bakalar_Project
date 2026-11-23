
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight, LockKeyhole, Terminal } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    if (user) {
        const next = params.get("next");
        const target = next?.startsWith("/") && !next.startsWith("//")
            ? next : "/";
        return <Navigate to={target} replace />;
    }

    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setBusy(true);

        try {
            await login(email, password);
            const next = params.get("next");
            navigate(
                next?.startsWith("/") && !next.startsWith("//") ? next : "/",
                { replace: true }
            );
        } catch {
            setError("Prihlásenie zlyhalo. Skontrolujte údaje a overenie e-mailu.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="ca-auth-page">
            <section className="ca-auth-intro">
                <div className="ca-auth-brand">
                    <Terminal size={24} />
                    CODE<span>ASSESS</span>
                </div>

                <div className="ca-auth-intro-content">
                    <p className="ca-auth-eyebrow">AUTOMATED PROGRAMMING ASSESSMENT / 01</p>
                    <h1>CODE.<br />TEST.<br /><span>ASSESS.</span></h1>
                    <p>
                        Informačný systém pre odovzdávanie a automatizované
                        hodnotenie riešení z programovania.
                    </p>
                </div>

                <div className="ca-auth-footer">
                    <span>STU / BAKALÁRSKA PRÁCA</span>
                    <span>2026</span>
                </div>
            </section>

            <section className="ca-auth-form-side">
                <div className="ca-auth-form-wrap">
                    <div className="ca-page-topline">
            <span className="ca-topline-left">
              <span className="ca-square" /> SECURE ACCESS
            </span>
                        <LockKeyhole size={17} />
                    </div>

                    <p className="ca-eyebrow ca-auth-form-kicker">
                        01 / PRIHLÁSENIE
                    </p>
                    <h2>Vitajte späť<span className="ca-period">.</span></h2>
                    <p className="ca-muted">
                        Prihláste sa do svojho účtu CodeAssess.
                    </p>

                    <form onSubmit={submit} className="ca-auth-form">
                        <label className="ca-label" htmlFor="login-email">
                            E-MAILOVÁ ADRESA
                        </label>
                        <input
                            id="login-email"
                            className="ca-input"
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="meno@stuba.sk"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <label className="ca-label" htmlFor="login-password">
                            HESLO
                        </label>
                        <input
                            id="login-password"
                            className="ca-input"
                            type="password"
                            required
                            autoComplete="current-password"
                            placeholder="••••••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        {error && <p role="alert" className="ca-error">{error}</p>}

                        <button type="submit" className="ca-submit" disabled={busy}>
                            {busy ? "PRIHLASOVANIE..." : "PRIHLÁSIŤ SA"}
                            <ArrowUpRight size={20} />
                        </button>
                    </form>

                    <p className="ca-auth-caption">
                        CODEASSESS / AUTHENTICATION MODULE
                    </p>
                </div>
            </section>
        </main>
    );
}