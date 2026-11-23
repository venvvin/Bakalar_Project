
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Check, Mail, AlertCircle } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function AcceptInvitationPage() {
    const [params] = useSearchParams();
    const { user } = useAuth();
    const [error, setError] = useState("");
    const [done, setDone] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const token = params.get("token");

    async function accept() {
        if (!token) return;
        setError("");
        setBusy(true);
        try {
            const { data } = await api.post<{ course_id: number }>(
                "/invitations/accept",
                { token }
            );
            setDone(data.course_id);
        } catch (err: unknown) {
            const response = err as {
                response?: { data?: { detail?: string } }
            };
            setError(
                response.response?.data?.detail ||
                "Pozvánku sa nepodarilo prijať."
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="ca-auth-page">
            <section className="ca-auth-intro">
                <div className="ca-auth-brand">
                    <Mail size={24} /> CODE<span>ASSESS</span>
                </div>
                <div className="ca-auth-intro-content">
                    <p className="ca-auth-eyebrow">COURSE ACCESS / INVITATION</p>
                    <h1>JOIN.<br />LEARN.<br /><span>CODE.</span></h1>
                    <p>Pripojte sa ku kurzu pomocou pozvánky od vyučujúceho.</p>
                </div>
                <div className="ca-auth-footer">
                    <span>CODEASSESS / STU</span>
                    <span>2026</span>
                </div>
            </section>

            <section className="ca-auth-form-side">
                <div className="ca-auth-form-wrap">
                    <div className="ca-page-topline">
            <span className="ca-topline-left">
              <span className="ca-square" /> INVITATION
            </span>
                        <Mail size={17} />
                    </div>

                    <p className="ca-eyebrow ca-auth-form-kicker">
                        02 / PRIJATIE POZVÁNKY
                    </p>
                    <h2>Pripojiť sa<span className="ca-period">.</span></h2>

                    {!token ? (
                        <div className="ca-message ca-message-error">
                            <AlertCircle size={20} />
                            V odkaze chýba token pozvánky.
                        </div>
                    ) : done !== null ? (
                        <div className="ca-invite-action">
                            <div className="ca-message ca-message-success">
                                <Check size={20} /> Boli ste pridaní do kurzu.
                            </div>
                            <Link className="ca-button" to={`/courses/${done}`}>
                                OTVORIŤ KURZ <ArrowUpRight size={18} />
                            </Link>
                        </div>
                    ) : !user ? (
                        <div className="ca-invite-action">
                            <p className="ca-muted">
                                Prihláste sa účtom, na ktorý bola pozvánka odoslaná.
                            </p>
                            <Link
                                className="ca-button"
                                to={`/login?next=${encodeURIComponent(
                                    `/invitations/accept?token=${token}`
                                )}`}
                            >
                                PRIHLÁSIŤ SA <ArrowUpRight size={18} />
                            </Link>
                        </div>
                    ) : user.role !== "STUDENT" ? (
                        <div className="ca-message ca-message-error">
                            Pozvánku môže prijať iba študent.
                        </div>
                    ) : (
                        <div className="ca-invite-action">
                            <p className="ca-muted">PRIHLÁSENÝ ÚČET</p>
                            <strong className="ca-invite-email">{user.email}</strong>
                            <button className="ca-submit" onClick={accept} disabled={busy}>
                                {busy ? "SPRACOVANIE..." : "PRIJAŤ POZVÁNKU"}
                                <ArrowUpRight size={20} />
                            </button>
                        </div>
                    )}

                    {error && <p className="ca-error" role="alert">{error}</p>}
                </div>
            </section>
        </main>
    );
}