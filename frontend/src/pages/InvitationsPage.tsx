import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Sidebar from '../components/Sidebar';
import { api } from '../api/client';


type Course = { id: number; name: string };
type Invitation = { id: number; email: string; status: string; expires_at: string; accepted_at: string | null };
type BulkResult = { email: string; status: string; reason?: string };
type BulkResponse = { total: number; sent: number; failed: number; results: BulkResult[] };

const parseEmails = (value: string) => Array.from(new Set(value.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean)));

export default function InvitationsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [emailsText, setEmailsText] = useState('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const emails = useMemo(() => parseEmails(emailsText), [emailsText]);

  useEffect(() => {
    api.get<Course[]>('/courses')
      .then(({ data }) => { setCourses(data); if (data.length) setCourseId(String(data[0].id)); })
      .catch(() => setError('Kurzy sa nepodarilo načítať.'));
  }, []);

  useEffect(() => {
    if (!courseId) { setInvitations([]); return; }
    api.get<Invitation[]>(`/invitations/courses/${courseId}`)
      .then(({ data }) => setInvitations(data))
      .catch(() => setError('Pozvánky sa nepodarilo načítať.'));
  }, [courseId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseId || emails.length === 0 || busy) return;
    if (emails.length > 50) { setError('Naraz môžete pozvať najviac 50 študentov.'); return; }
    if (emails.some(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      setError('Skontrolujte formát e-mailových adries.'); return;
    }
    setBusy(true); setError(''); setMessage(''); setResults([]);
    try {
      const { data } = await api.post<BulkResponse>(`/invitations/courses/${courseId}/bulk`, { emails });
      setResults(data.results);
      setMessage(`Odoslané: ${data.sent} · Neúspešné: ${data.failed}`);
      if (data.sent > 0) setEmailsText('');
      const refreshed = await api.get<Invitation[]>(`/invitations/courses/${courseId}`);
      setInvitations(refreshed.data);
    } catch (err: unknown) {
      const response = err as { response?: { data?: { detail?: string } } };
      setError(response.response?.data?.detail || 'Pozvánky sa nepodarilo odoslať.');
    } finally { setBusy(false); }
  }

  return (
    <div className="ca-invites-shell">
      <Sidebar />
      <main className="ca-invites-main">
        <div className="ca-invites-kicker"><span className="ca-square" /> CODEASSESS / SPRÁVA KURZOV / 03</div>
        <header className="ca-invites-header">
          <div><p className="ca-eyebrow">SPRÁVA PRÍSTUPU</p><h1>Pozvánky<span className="ca-period">.</span></h1><p className="ca-lead">Pridajte študentov do kurzu jednotlivo alebo hromadne.</p></div>
          <div className="ca-counter"><strong>{invitations.length.toString().padStart(2, '0')}</strong><span>POZVÁNOK</span></div>
        </header>
        <div className="ca-invites-grid">
          <form className="ca-panel" onSubmit={submit}>
            <div className="ca-panel-top"><span>01 / NOVÁ POZVÁNKA</span><span className="ca-pixel-icon" aria-hidden="true">✳</span></div>
            <div className="ca-panel-body">
              <h2>Pozvať študentov</h2>
              <p className="ca-muted">Jedna adresa alebo celý zoznam. Duplicitné adresy automaticky odstránime.</p>
              <label className="ca-field">KURZ<select value={courseId} required onChange={e => { setCourseId(e.target.value); setError(''); setResults([]); }}><option value="">Vyberte kurz</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="ca-field">E-MAILOVÉ ADRESY<textarea value={emailsText} onChange={e => setEmailsText(e.target.value)} placeholder={'student1@stuba.sk\nstudent2@stuba.sk\nstudent3@stuba.sk'} rows={6} required /></label>
              <div className="ca-field-foot"><span>Oddeľte čiarkou, bodkočiarkou alebo novým riadkom.</span><strong>{emails.length} / 50</strong></div>
              {error && <div className="ca-error" role="alert">{error}</div>}
              {message && <div className="ca-success" role="status">{message}</div>}
              <button className="ca-submit" type="submit" disabled={busy || !courseId || emails.length === 0 || emails.length > 50}>{busy ? 'ODOSIELANIE...' : 'ODOSLAŤ POZVÁNKY'} <span aria-hidden="true">↗</span></button>
            </div>
          </form>
          <section className="ca-panel ca-info-panel"><div className="ca-panel-top"><span>02 / AKO TO FUNGUJE</span><span aria-hidden="true">↗</span></div><div className="ca-panel-body"><h2>Jednoducho.<br />Bez chaosu.</h2><div className="ca-steps"><div><b>01</b><p>Vyberte kurz a vložte e-mailové adresy.</p></div><div><b>02</b><p>Študentom príde osobná pozvánka e-mailom.</p></div><div><b>03</b><p>Po prihlásení a prijatí pozvánky získajú prístup ku kurzu.</p></div></div><div className="ca-info-note">↳ POZVÁNKA PLATÍ 7 DNÍ</div></div></section>
        </div>
        {results.length > 0 && <section className="ca-panel ca-results"><div className="ca-panel-top">03 / VÝSLEDOK ODOSIELANIA</div><div className="ca-panel-body">{results.map((item, index) => <div className="ca-result-row" key={`${item.email}-${index}`}><span>{item.email}</span><span className={item.status === 'sent' ? 'ca-state-ok' : 'ca-state-fail'}>{item.status === 'sent' ? 'ODOSLANÉ' : `CHYBA: ${item.reason || 'Neznáma chyba'}`}</span></div>)}</div></section>}
        <section className="ca-panel ca-history"><div className="ca-panel-top"><span>04 / HISTÓRIA POZVÁNOK</span><span>{invitations.length} ZÁZNAMOV</span></div><div className="ca-panel-body"><h2>Odoslané pozvánky</h2>{invitations.length === 0 ? <p className="ca-muted">Zatiaľ žiadne pozvánky pre tento kurz.</p> : <div className="ca-table-scroll"><table><thead><tr><th>E-MAIL</th><th>STAV</th><th>PLATNOSŤ DO</th></tr></thead><tbody>{invitations.map(inv => <tr key={inv.id}><td>{inv.email}</td><td><span className={`ca-status ca-status-${inv.status.toLowerCase()}`}>{inv.status}</span></td><td>{new Date(inv.expires_at).toLocaleString('sk-SK')}</td></tr>)}</tbody></table></div>}</div></section>
      </main>
    </div>
  );
}
