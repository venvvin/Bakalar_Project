
import { useLocation } from "react-router-dom";
import { Construction, ArrowUpRight } from "lucide-react";
import Sidebar from "../components/Sidebar";

const pages: Record<string, { title: string; description: string }> = {
    "/assignments": {
        title: "Zadania",
        description: "Prehľad programovacích zadaní.",
    },
    "/students": {
        title: "Študenti",
        description: "Správa študentov a ich výsledkov.",
    },
    "/settings": {
        title: "Nastavenia",
        description: "Nastavenia používateľského účtu a systému.",
    },
};

export default function PlaceholderPage() {
    const { pathname } = useLocation();
    const page = pages[pathname] ?? {
        title: "Stránka neexistuje",
        description: "Požadovaná stránka sa nenašla.",
    };

    return (
        <div className="ca-app-layout">
            <Sidebar />
            <main className="ca-dashboard-main">
                <div className="ca-page-topline">
          <span className="ca-topline-left">
            <span className="ca-square" /> CODEASSESS / SYSTEM
          </span>
                    <span>MODULE / DEVELOPMENT</span>
                </div>

                <header className="ca-dashboard-header">
                    <div>
                        <p className="ca-eyebrow">SYSTEM / MODULE</p>
                        <h1>{page.title}<span className="ca-period">.</span></h1>
                        <p className="ca-dashboard-description">{page.description}</p>
                    </div>
                </header>

                <section className="ca-panel ca-placeholder-panel">
                    <div className="ca-panel-top">
                        <span>MODULE STATUS</span>
                        <Construction size={18} />
                    </div>
                    <div className="ca-placeholder-body">
                        <span className="ca-placeholder-index">[ 00 / DEV ]</span>
                        <Construction size={42} strokeWidth={1.5} />
                        <h2>Vo vývoji<span className="ca-period">.</span></h2>
                        <p>
                            Tento modul sa pripravuje. Jeho funkcie budú dostupné
                            v ďalšej fáze vývoja.
                        </p>
                        <span className="ca-placeholder-bottom">
              CODEASSESS / WORK IN PROGRESS
              <ArrowUpRight size={18} />
            </span>
                    </div>
                </section>
            </main>
        </div>
    );
}