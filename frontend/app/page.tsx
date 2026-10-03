"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Skeleton, StatCard, Tooltip } from "../components/ui";

type Holding = {
  id: string;
  market: string;
  symbol: string;
  quantity: string;
  average_cost: string;
  currency: string;
  enabled: boolean;
};
type Watch = {
  id: string;
  market: string;
  symbol: string;
  enabled: boolean;
  upper_percent: string | null;
  lower_percent: string | null;
  upper_price: string | null;
  lower_price: string | null;
  current_price?: string | null;
  current_currency?: string | null;
  current_change_percent?: string | null;
  quoted_at?: string | null;
  quote_stale?: boolean;
};
type Alert = {
  id: string;
  market: string;
  symbol: string;
  alert_type: string;
  reference_price: string | null;
  trigger_price: string | null;
  change_percent: string | null;
  message: string | null;
  status: string;
  triggered_at: string;
  delivered_at: string | null;
  retry_count: number;
  last_error: string | null;
};
type StockSearch = {
  symbol: string;
  name: string;
  market: string;
  exchange?: string;
  currency?: string;
};
type Setting = { key: string; value: unknown };
type Quote = {
  market: string;
  symbol: string;
  price: string;
  currency: string;
  change_percent: string | null;
  source: string;
  quoted_at: string;
  stale: boolean;
};
type Stock = {
  symbol: string;
  name: string;
  exchange: string | null;
  market: string;
  currency: string;
};
type Summary = {
  rows: {
    id: string;
    market: string;
    symbol: string;
    currency: string;
    cost_basis: number;
    current_value: number | null;
    pnl: number | null;
    pnl_percent: number | null;
    realized_pnl?: number;
    unrealized_pnl?: number;
    stale: boolean;
  }[];
  totals: Record<
    string,
    {
      cost_basis: number;
      current_value: number;
      pnl: number;
      realized_pnl?: number;
      unrealized_pnl?: number;
    }
  >;
};
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) => fetch(input, { ...init, credentials: "include" });
const NAV: { [k: string]: string } = {
  dashboard: "ภาพรวม (Dashboard)",
  portfolio: "พอร์ตการลงทุน (Portfolio)",
  watchlist: "รายการติดตาม (Watchlist)",
  alerts: "การแจ้งเตือน (Alerts)",
  settings: "ตั้งค่า (Settings)",
};

const GLOSSARY = {
  pnl: {
    label: "กำไร/ขาดทุน (P/L)",
    help: "ผลต่างระหว่างมูลค่าปัจจุบันกับต้นทุนของรายการในพอร์ต ตัวเลขและวิธีคำนวณไม่เปลี่ยนแปลง",
  },
  costBasis: {
    label: "ต้นทุนสะสม (Cost Basis)",
    help: "ต้นทุนที่ใช้เป็นฐานสำหรับติดตามกำไร/ขาดทุนของพอร์ต",
  },
  unrealized: {
    label: "กำไร/ขาดทุนที่ยังไม่เกิดขึ้นจริง (Unrealized P/L)",
    help: "กำไรหรือขาดทุนจากราคาปัจจุบันของหุ้นที่ยังไม่ได้ขาย",
  },
  realized: {
    label: "กำไร/ขาดทุนที่เกิดขึ้นแล้ว (Realized P/L)",
    help: "กำไรหรือขาดทุนจากรายการที่ขายและรับรู้ผลแล้ว",
  },
  alert: {
    label: "เงื่อนไขแจ้งเตือน (Alert Condition)",
    help: "เงื่อนไขราคาหรือเปอร์เซ็นต์ที่กำหนดไว้เพื่อให้ระบบสร้างการแจ้งเตือน",
  },
} as const;
const toNumber = (v: number | string | null | undefined) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const pct = (v: number | null | string) => {
  const n = toNumber(v);
  return n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};
const money = (v: number | string | null, c = "") => {
  const n = toNumber(v);
  if (n == null) return "—";
  const normalized = Math.abs(n) < 0.000000005 ? 0 : n;
  return `${c} ${normalized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const quantity = (v: number | string | null) => {
  const n = toNumber(v);
  if (n == null) return "—";
  const normalized = Math.abs(n) < 0.000000005 ? 0 : n;
  return normalized.toLocaleString(undefined, { maximumFractionDigits: 8 });
};
const alertLabel = (t: string) =>
  (
    ({
      watchlist_upper: "ถึงเป้าหมายด้านบน (Upper Target)",
      watchlist_lower: "ถึงเป้าหมายด้านล่าง (Lower Target)",
      portfolio_open_TH: "ตลาดหุ้นไทยเปิด (Market Open)",
      portfolio_close_TH: "ตลาดหุ้นไทยปิด (Market Close)",
      portfolio_open_US: "ตลาดหุ้นสหรัฐเปิด (Market Open)",
      portfolio_close_US: "ตลาดหุ้นสหรัฐปิด (Market Close)",
    }) as any
  )[t] || t;
const statusLabel = (s: string) =>
  s === "delivered"
    ? "ส่งแล้ว (Delivered)"
    : s === "failed"
      ? "ส่งไม่สำเร็จ (Failed)"
      : s === "retrying"
        ? "กำลังส่งอีกครั้ง (Retrying)"
        : "กำลังส่ง (Pending)";
const transactionStatusLabel = (s: string) => ({
  FILLED: "ดำเนินการแล้ว (FILLED) · จับคู่แล้ว", MATCHED: "ดำเนินการแล้ว (FILLED) · จับคู่แล้ว",
  PENDING: "รอดำเนินการ (PENDING) · รอจับคู่", CANCELLED: "ยกเลิก (CANCELLED)",
  REJECTED: "ไม่รับคำสั่ง (REJECTED)",
} as Record<string, string>)[s] || s;
const alertDeliveryHelp = (status: string, message: string | null) => {
  if (status === "failed") {
    return {
      text: message || "การแจ้งเตือนเกิดขึ้น แต่ส่งไม่สำเร็จและอาจทำให้คุณพลาดการติดตามเงื่อนไขนี้",
      action: "ตรวจสอบการตั้งค่าการแจ้งเตือนและลองใหม่",
    };
  }
  if (status === "delivered") {
    return {
      text: message || "เงื่อนไขแจ้งเตือนทำงานและระบบส่งการแจ้งเตือนแล้ว",
      action: "ตรวจสอบราคาและพอร์ตตามข้อมูลที่ได้รับ",
    };
  }
  return {
    text: message || "เงื่อนไขแจ้งเตือนทำงานและกำลังรอการส่ง",
    action: "ติดตามสถานะการส่งจากหน้านี้",
  };
};
const freshnessLabel = (q: Quote | null | undefined) => {
  if (!q) return "ไม่มีข้อมูล";
  if (q.stale) return "ข้อมูลล่าช้า";
  const age = Math.max(
    0,
    Math.floor((Date.now() - new Date(q.quoted_at).getTime()) / 60000),
  );
  return age >= 1 ? `อัปเดต ${age} นาทีที่แล้ว` : "ข้อมูลล่าสุด";
};
const displayMoney = (
  v: number | null,
  native: string,
  display: string,
  fx: number | null,
) => {
  if (v == null) return "—";
  if (display === "native" || display === native) return money(v, native);
  if (native === "USD" && display === "THB" && fx) return money(v * fx, "THB");
  if (native === "THB" && display === "USD" && fx) return money(v / fx, "USD");
  return money(v, native);
};
const displayCurrency = (native: string, display: string) =>
  display === "native" ? native : display;

export default function Home() {
  const [page, setPage] = useState("dashboard"),
    [darkPremium, setDarkPremium] = useState(false),
    [holdings, setHoldings] = useState<Holding[]>([]),
    [watch, setWatch] = useState<Watch[]>([]),
    [alerts, setAlerts] = useState<Alert[]>([]),
    [settings, setSettings] = useState<Setting[]>([]),
    [quotes, setQuotes] = useState<Quote[]>([]),
    [summary, setSummary] = useState<Summary | null>(null),
    [system, setSystem] = useState<any>(null),
    [providers, setProviders] = useState<any[]>([]),
    [market, setMarket] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [stockStatus, setStockStatus] = useState<any>(null),
    [fx, setFx] = useState<any>(null),
    [authOk, setAuthOk] = useState(false),
    [authReady, setAuthReady] = useState(false);
  const display = String(
    settings.find((x) => x.key === "display_currency")?.value || "native",
  );
  const fxRate = fx?.rate ? Number(fx.rate) : null;
  async function load(silent = false) {
    if (!silent) setLoading(true);
    setError("");
    try {
      const paths = [
        "portfolio",
        "watchlist",
        "alerts/history",
        "settings",
        "market/quotes",
        "portfolio/summary",
        "system/status",
        "market/status",
        "market/providers/health",
        "market/stocks/status",
        "fx/usd-thb",
      ];
      const rs = await Promise.all(
        paths.map((x) => apiFetch(`${API}/api/v1/${x}`)),
      );
      if (rs.some((x) => x.status === 401)) {
        setAuthOk(false);
        setAuthReady(true);
        setLoading(false);
        return;
      }
      if (rs.some((x) => !x.ok)) throw Error("API");
      setAuthOk(true);
      setAuthReady(true);
      const data = await Promise.all(rs.map((x) => x.json()));
      setHoldings(data[0]);
      setWatch(data[1]);
      setAlerts(data[2]);
      setSettings(data[3]);
      setQuotes(data[4]);
      setSummary(data[5]);
      setSystem(data[6]);
      setMarket(data[7]);
      setProviders(data[8]);
      setStockStatus(data[9]);
      setFx(data[10]);
    } catch {
      setAuthReady(true);
      setError("เชื่อมต่อ API ไม่สำเร็จ");
    } finally {
      if (!silent) setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const onReload = () => load(true);
    window.addEventListener("mystockalert:reload", onReload);
    return () => window.removeEventListener("mystockalert:reload", onReload);
  }, []);
  useEffect(() => {
    const value = settings.find((x) => x.key === "refresh_interval")?.value;
    const seconds = Number(value) || 30;
    const id = window.setInterval(
      () => load(true),
      Math.max(15, seconds) * 1000,
    );
    return () => window.clearInterval(id);
  }, [settings]);
  useEffect(() => {
    document.body.classList.toggle("ms-dark-premium-root", darkPremium);
    return () => document.body.classList.remove("ms-dark-premium-root");
  }, [darkPremium]);
  if (!authReady) return <div className="ms-shell"><div className="ms-card ms-card-body">กำลังตรวจสอบสิทธิ์...</div></div>;
  if (!authOk) return <LoginScreen onSuccess={() => load()} />;
  return (
    <div className={darkPremium ? "ms-shell ms-dark-premium" : "ms-shell"}>
      <aside className="ms-sidebar">
        <div className="ms-brand">
          <div className="ms-brand-mark">MS</div>
          <div>
            <strong>MyStockAlert</strong>
            <small>Portfolio Monitor</small>
          </div>
        </div>
        <nav>
          {Object.entries(NAV).map(([k, v]) => (
            <button
              key={k}
              className={page === k ? "ms-nav ms-nav-active" : "ms-nav"}
              onClick={() => setPage(k)}
            >
              {v}
            </button>
          ))}
        </nav>
        <div className="ms-sidebar-footer">
          <span className={system?.database ? "ms-dot" : "ms-dot ms-dot-off"} />
          {system?.database ? "เชื่อมต่อระบบแล้ว" : "กำลังตรวจสอบ..."}
          <button className="ms-logout-button" onClick={async () => { await apiFetch(`${API}/api/v1/auth/logout`, { method: "POST" }); setAuthOk(false); setAuthReady(true); }}>ออกจากระบบ</button>
        </div>
      </aside>
      <main className="ms-main">
        <header className="ms-header">
          <div>
            <h1>{page === "system" ? "สถานะระบบ" : NAV[page]}</h1>
            <p>
              {page === "dashboard"
                ? "ภาพรวมพอร์ต การเคลื่อนไหว และการแจ้งเตือน"
                : page === "portfolio"
                  ? "จัดการหุ้นที่ถือและบันทึกรายการธุรกรรม"
                  : page === "watchlist"
                    ? "ติดตามราคาและกำหนดเงื่อนไขแจ้งเตือน"
                    : page === "system"
                      ? "ตรวจสอบสถานะบริการและผู้ให้บริการราคา"
                      : "จัดการการแจ้งเตือนและการตั้งค่าระบบ"}
            </p>
          </div>
          <div className="ms-header-actions">
            <button
              className="ms-theme-toggle"
              onClick={() => setDarkPremium((v) => !v)}
              aria-label="เปลี่ยนธีม"
            >
              {darkPremium ? "Light Glass" : "Dark Premium"}
            </button>
            {page === "dashboard" && <FxMini />}
            {page === "dashboard" && (
              <div className="ms-market-status">
                <span className="ms-market-status-label">Market Status</span>
                <div className="ms-market-dots">
                  {market.map((x) => (
                    <span
                      key={x.market}
                      className="ms-market-dot"
                      title={x.timezone}
                    >
                      <i className={x.open ? "open" : "closed"} />
                      {x.market === "TH" ? "TH" : "US"}{" "}
                      {x.open ? "เปิด" : "ปิด"}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <button
              className="ms-button ms-button-light"
              title="โหลดข้อมูลล่าสุดจาก API"
              onClick={() => load()}
            >
              ↻ รีเฟรช
            </button>
          </div>
        </header>
        {error && <div className="ms-banner ms-banner-error">{error}</div>}
        {loading ? (
          <div className="ms-card ms-card-body">กำลังโหลดข้อมูล...</div>
        ) : page === "dashboard" ? (
          <Dashboard
            h={holdings}
            w={watch}
            a={alerts}
            s={summary}
            quotes={quotes}
            display={display}
            fx={fxRate}
          />
        ) : page === "portfolio" ? (
          <Portfolio
            rows={holdings}
            quotes={quotes}
            reload={load}
            display={display}
            fx={fxRate}
          />
        ) : page === "watchlist" ? (
          <Watchlist rows={watch} quotes={quotes} reload={load} />
        ) : page === "alerts" ? (
          <Alerts rows={alerts} quotes={quotes} />
        ) : page === "settings" ? (
          <Settings
            rows={settings}
            reload={load}
            stockStatus={stockStatus}
            fx={fx}
          />
        ) : (
          <SystemStatus system={system} providers={providers} />
        )}
      </main>
    </div>
  );
}

function FxMini() {
  const [fx, setFx] = useState<any>(null);
  useEffect(() => {
    apiFetch(`${API}/api/v1/fx/usd-thb`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setFx)
      .catch(() => {});
  }, []);
  return (
    <div className="ms-fx-mini">
      <span>USD/THB</span>
      <strong>{fx?.rate ? Number(fx.rate).toFixed(4) : "—"}</strong>
      {fx?.status === "STALE" && <small className="ms-table-sub">⚠ Stale</small>}
      {fx?.status === "FALLBACK" && <small className="ms-table-sub">⚠ Fallback · {fx.source}</small>}
    </div>
  );
}
function DataFreshnessBanner({ quotes }: { quotes: Quote[] }) {
  const stale = quotes.filter((q) => q.stale);
  if (!stale.length) return null;
  return (
    <div className="ms-data-warning">
      <strong>⚠ ข้อมูลราคาบางรายการล่าช้า</strong>
      <span>
        {stale.length} รายการเกิน 5 นาที · ระบบจะแสดงราคาล่าสุดที่ได้รับ
      </span>
    </div>
  );
}
function Card({
  label,
  value,
  sub,
}: {
  label: ReactNode;
  value: string;
  sub?: ReactNode;
}) {
  return <StatCard label={label} value={value} sub={sub} />;
}
function Dashboard({
  h,
  w,
  a,
  s,
  quotes,
  display,
  fx,
}: {
  h: Holding[];
  w: Watch[];
  a: Alert[];
  s: Summary | null;
  quotes: Quote[];
  display: string;
  fx: number | null;
}) {
  const th = s?.totals?.THB,
    us = s?.totals?.USD;
  const thPct = th && th.cost_basis ? (th.pnl / th.cost_basis) * 100 : null;
  const usPct = us && us.cost_basis ? (us.pnl / us.cost_basis) * 100 : null;
  const totalNative =
    (th?.current_value || 0) + (us?.current_value || 0) * (fx || 0);
  const totalCost = (th?.cost_basis || 0) + (us?.cost_basis || 0) * (fx || 0);
  return (
    <>
      <DataFreshnessBanner quotes={quotes} />
      <section className="ms-grid ms-grid-4">
        <Card label="หุ้นที่ถืออยู่ (Holdings)" value={String(h.length)} />
        <Card
          label={<><span>มูลค่าพอร์ตหุ้นไทย (TH Portfolio Value)</span> <Tooltip label="อธิบายมูลค่าพอร์ตหุ้นไทย">มูลค่าปัจจุบันของหุ้นไทยตามข้อมูลราคาล่าสุดที่ระบบได้รับ</Tooltip></>}
          value={displayMoney(th?.current_value ?? 0, "THB", display, fx)}
          sub={
            th
              ? <>{GLOSSARY.costBasis.label} {displayMoney(th.cost_basis, "THB", display, fx)} · {GLOSSARY.pnl.label} {displayMoney(th.pnl, "THB", display, fx)} ({pct(thPct)}) · {GLOSSARY.realized.label} {displayMoney(th.realized_pnl ?? 0, "THB", display, fx)} · {GLOSSARY.unrealized.label} {displayMoney(th.unrealized_pnl ?? 0, "THB", display, fx)}</>
              : "—"
          }
        />
        <Card
          label={<><span>มูลค่าพอร์ตหุ้นสหรัฐ (US Portfolio Value)</span> <Tooltip label="อธิบายมูลค่าพอร์ตหุ้นสหรัฐ">มูลค่าปัจจุบันของหุ้นสหรัฐตามข้อมูลราคาล่าสุดที่ระบบได้รับ</Tooltip></>}
          value={displayMoney(us?.current_value ?? 0, "USD", display, fx)}
          sub={
            us
              ? <>{GLOSSARY.costBasis.label} {displayMoney(us.cost_basis, "USD", display, fx)} · {GLOSSARY.pnl.label} {displayMoney(us.pnl, "USD", display, fx)} ({pct(usPct)}) · {GLOSSARY.realized.label} {displayMoney(us.realized_pnl ?? 0, "USD", display, fx)} · {GLOSSARY.unrealized.label} {displayMoney(us.unrealized_pnl ?? 0, "USD", display, fx)}</>
              : "—"
          }
        />
        <Card label="การแจ้งเตือน (Alerts)" value={String(a.length)} sub="ประวัติทั้งหมด" />
      </section>
      <section className="ms-card ms-dashboard-gap ms-dashboard-portfolio">
        <div className="ms-card-header">
          <div>
            <h2 className="ms-section-title">พอร์ตการลงทุน (Portfolio)</h2>
            <p className="ms-section-subtitle">
              มูลค่าพอร์ต · แสดง{" "}
              {display === "native" ? "สกุลเงินของแต่ละตลาด" : display}{" "}
              {fx && display !== "native"
                ? `· USD/THB ${Number(fx).toFixed(4)}`
                : ""}
            </p>
          </div>
        </div>
        <div className="ms-dashboard-markets">
          <DashboardMarket
            market="TH"
            title="หุ้นไทย"
            currency="THB"
            rows={h}
            quotes={quotes}
            display={display}
            fx={fx}
          />
          <DashboardMarket
            market="US"
            title="หุ้นสหรัฐ"
            currency="USD"
            rows={h}
            quotes={quotes}
            display={display}
            fx={fx}
          />
        </div>
      </section>
      <section className="ms-card ms-dashboard-gap">
        <div className="ms-card-header">
          <div>
            <h2 className="ms-section-title">รายการติดตาม (Watchlist)</h2>
            <p className="ms-section-subtitle">
              รายการที่กำลังติดตามและเงื่อนไขแจ้งเตือน
            </p>
          </div>
        </div>
        <WatchTable rows={w} quotes={quotes} />
      </section>
    </>
  );
}
function DashboardMarket({
  market,
  title,
  currency,
  rows,
  quotes,
  display,
  fx,
}: {
  market: string;
  title: string;
  currency: string;
  rows: Holding[];
  quotes: Quote[];
  display: string;
  fx: number | null;
}) {
  const list = rows.filter((x) => x.market === market);
  return (
    <div className="ms-dashboard-market">
      <div className="ms-dashboard-market-head">
        <div>
          <h3>{title}</h3>
          <span>
            {list.length} รายการ · {currency}
          </span>
        </div>
      </div>
      <StockTable rows={list} q={quotes} display={display} fx={fx} />
    </div>
  );
}
function StockTable({
  rows,
  q,
  display,
  fx,
}: {
  rows: Holding[];
  q: Quote[];
  display: string;
  fx: number | null;
}) {
  const body = rows.map((x) => {
    const z = q.find((v) => v.market === x.market && v.symbol === x.symbol);
    const pl = z ? (Number(z.price) / Number(x.average_cost) - 1) * 100 : null;
    return (
      <tr key={x.id}>
        <td>{x.market}</td>
        <td>
          <strong>{x.symbol}</strong>
        </td>
        <td className="numeric">{quantity(x.quantity)}</td>
        <td>{money(Number(x.average_cost), x.currency)}</td>
        <td>
          {z ? displayMoney(Number(z.price), z.currency, display, fx) : "—"}
          {z && <small className="ms-table-sub">{freshnessLabel(z)}</small>}
        </td>
        <td className={pl != null && pl >= 0 ? "ms-positive" : "ms-negative"}>
          {pct(pl)}
        </td>
        <td>{x.currency}</td>
      </tr>
    );
  });
  return (
    <div className="ms-table-wrap">
      <table className="ms-table ms-table-stock">
        <thead>
          <tr>
            <th>ตลาด (Market)</th>
            <th>หุ้น (Symbol)</th>
            <th>จำนวน (Qty)</th>
            <th>ต้นทุนเฉลี่ยต่อหุ้น (Avg Cost)</th>
            <th>ราคาล่าสุด (Price)</th>
            <th>กำไร/ขาดทุน (P/L)</th>
            <th>สกุลเงิน (Currency)</th>
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
      {!rows.length && (
        <Empty text="ยังไม่มีหุ้นใน Portfolio — เพิ่มหุ้นเพื่อเริ่มติดตามพอร์ต" />
      )}
    </div>
  );
}
function WatchTable({
  rows,
  quotes,
  editable = false,
  onEdit,
  onDelete,
}: {
  rows: Watch[];
  quotes?: Quote[];
  editable?: boolean;
  onEdit?: (x: Watch) => void;
  onDelete?: (id: string) => void;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
    openUp: boolean;
  } | null>(null);
  return (
    <div className="ms-dashboard-watchlist-list">
      {rows.map((x) => {
        const q = quotes?.find(
          (z) => z.market === x.market && z.symbol === x.symbol,
        ) ?? (x.current_price != null ? {
          market: x.market, symbol: x.symbol, price: x.current_price,
          currency: x.current_currency || (x.market === "US" ? "USD" : "THB"),
          change_percent: x.current_change_percent ?? null, source: "watchlist",
          quoted_at: x.quoted_at || new Date().toISOString(), stale: Boolean(x.quote_stale),
        } as Quote : undefined);
        const rules = [
          x.upper_percent != null ? "↑ " + pct(x.upper_percent) : null,
          x.lower_percent != null ? "↓ " + pct(x.lower_percent) : null,
          x.upper_price != null ? "↑ " + money(Number(x.upper_price), q?.currency || "") : null,
          x.lower_price != null ? "↓ " + money(Number(x.lower_price), q?.currency || "") : null,
        ].filter(Boolean);
        return (
          <div className="ms-watch-item" key={x.id}>
            <div className="ms-watch-item-main">
              <div className="ms-watch-stock">
                <strong>{x.symbol}</strong>
                <small>{x.market}</small>
              </div>
              <div className="ms-watch-price">
                <strong>{q ? money(Number(q.price), q.currency) : "—"}</strong>
                <small>ราคาล่าสุด (Current Price)</small>
              </div>
              <div className={q && Number(q.change_percent || 0) >= 0 ? "ms-watch-change ms-positive" : "ms-watch-change ms-negative"}>
                <strong>{q ? pct(q.change_percent) : "—"}</strong>
              </div>
              <div className="ms-watch-alert">
                <span>{rules.length ? rules.join("  ") : "—"}</span>
                <small>เงื่อนไขแจ้งเตือน (Alert)</small>
              </div>
              {editable && (
                <div className="ms-row-menu ms-watch-item-menu">
                  <button
                    className="ms-menu-button"
                    onClick={(e) => {
                      if (openMenu === x.id) {
                        setOpenMenu(null);
                        setMenuPosition(null);
                        return;
                      }
                      const rect = e.currentTarget.getBoundingClientRect();
                      const estimatedMenuHeight = 100;
                      const gap = 6;
                      const openUp =
                        rect.bottom + estimatedMenuHeight + gap > window.innerHeight;
                      setOpenMenu(x.id);
                      setMenuPosition({
                        top: openUp
                          ? Math.max(12, rect.top - estimatedMenuHeight - gap)
                          : rect.bottom + gap,
                        right: Math.max(12, window.innerWidth - rect.right),
                        openUp,
                      });
                    }}
                    aria-label="จัดการ Watchlist"
                    title="จัดการ"
                    aria-expanded={openMenu === x.id}
                  >
                    ⚙
                  </button>
                  {openMenu === x.id && menuPosition && typeof document !== "undefined"
                    ? createPortal(
                        <div
                          className={"ms-row-menu-popover ms-floating-menu" + (menuPosition.openUp ? " open-up" : "")}
                          style={{ top: menuPosition.top, right: menuPosition.right }}
                        >
                          <button onClick={() => { setOpenMenu(null); setMenuPosition(null); onEdit?.(x); }}>แก้ไข</button>
                          <button className="danger" onClick={() => { setOpenMenu(null); setMenuPosition(null); onDelete?.(x.id); }}>ลบ</button>
                        </div>,
                        document.body,
                      )
                    : null}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {!rows.length && (
        <Empty
          text={
            editable
              ? "ยังไม่มี Watchlist — กด “＋ เพิ่มรายการ” เพื่อเริ่มติดตามหุ้น"
              : "ยังไม่มี Watchlist"
          }
        />
      )}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="ms-empty">{text}</div>;
}
function StockPicker({
  market,
  value,
  onChange,
  onMarketChange,
}: {
  market: string;
  value: string;
  onChange: (stock: StockSearch) => void;
  onMarketChange?: (market: string) => void;
}) {
  const [q, setQ] = useState(value),
    [results, setResults] = useState<StockSearch[]>([]),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => setQ(value), [value]);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await apiFetch(
          API +
            "/api/v1/market/search?q=" +
            encodeURIComponent(term) +
            "&market=" +
            market,
        );
        setResults(r.ok ? await r.json() : []);
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q, market]);
  return (
    <div className="ms-stock-picker">
      <label>หุ้น</label>
      <div className="ms-stock-input-wrap">
        <label className="ms-stock-market-select">
          <span>ตลาด</span>
          <select
            aria-label="เลือกตลาดหุ้น"
            value={market}
            onChange={(e) => onMarketChange?.(e.target.value)}
          >
            <option value="TH">TH · หุ้นไทย</option>
            <option value="US">US · หุ้นสหรัฐ</option>
          </select>
        </label>
        <span className="ms-stock-search-icon">⌕</span>
        <input
          aria-label={market === "US" ? "ค้นหาหุ้นสหรัฐ" : "ค้นหาหุ้นไทย"}
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value.toUpperCase());
            setOpen(true);
          }}
          placeholder={market === "US" ? "ค้นหาหุ้นสหรัฐ เช่น AAPL, NVDA, MSFT" : "ค้นหาหุ้นไทย เช่น PTT, AOT, CPALL"}
        />
        {busy && <small>กำลังค้นหา...</small>}
      </div>
      {open && q.trim() && results.length > 0 && (
        <div className="ms-stock-results">
          {results.map((x) => (
            <button
              type="button"
              key={x.market + "-" + x.symbol}
              onClick={() => {
                onChange(x);
                setQ(x.symbol);
                setOpen(false);
              }}
            >
              <strong>{x.symbol}</strong>
              <span>{x.name}</span>
              <small>
                {x.exchange || x.market} · {x.currency || ""}
              </small>
            </button>
          ))}
        </div>
      )}
      {open && q.trim() && !busy && !results.length && (
        <div className="ms-stock-results">
          <div className="ms-stock-no-result">ไม่พบหุ้นที่ค้นหา</div>
        </div>
      )}
    </div>
  );
}

function Portfolio({
  rows,
  quotes,
  reload,
  display,
  fx,
}: {
  rows: Holding[];
  quotes: Quote[];
  reload: () => void;
  display: string;
  fx: number | null;
}) {
  const empty = {
    market: "TH",
    symbol: "",
    currency: "THB",
    enabled: true,
  };
  const [mode, setMode] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<Holding | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number; openUp: boolean } | null>(null);
  const [f, setF] = useState<any>(empty);
  const [tx, setTx] = useState<any>({
    side: "BUY",
    status: "FILLED",
    order_id: "",
    idempotency_key: "",
    quantity: "",
    execution_price: "",
    commission: "",
    trading_fee: "",
    clearing_fee: "",
    regulatory_fee: "",
    cat_fee: "",
    sec_fee: "",
    taf_fee: "",
    vat: "",
    fx_rate: "",
    executed_at: "",
  });
  const [showFees, setShowFees] = useState(false),
    [txs, setTxs] = useState<any[]>([]),
    [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const reset = () => {
    setMode(null);
    setF(empty);
  };
  async function save() {
    const url =
      mode === "edit"
        ? `${API}/api/v1/portfolio/${f.id}`
        : `${API}/api/v1/portfolio`;
    const r = await apiFetch(url, {
      method: mode === "edit" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        market: f.market,
        symbol: f.symbol,
        currency: f.currency,
        enabled: f.enabled,
      }),
    });
    if (!r.ok) return alert("บันทึก Portfolio ไม่สำเร็จ");
    reset();
    reload();
  }
  async function remove(id: string) {
    const r = await apiFetch(`${API}/api/v1/portfolio/${id}`, {
      method: "DELETE",
    });
    if (r.ok) {
      setSelected(null);
      reload();
    }
  }
  async function openTx(h: Holding) {
    setSelected(h);
    const r = await apiFetch(`${API}/api/v1/portfolio/${h.id}/transactions`);
    setTxs(r.ok ? await r.json() : []);
    setShowFees(false);
    setTx({
      ...tx,
      side: "BUY",
      status: "FILLED",
      quantity: "",
      execution_price: "",
      order_id: "",
      idempotency_key: crypto.randomUUID(),
      fx_rate: h.currency === "USD" && fx ? String(fx) : "",
      executed_at: "",
    });
  }
  async function saveTx() {
    if (!selected) return;
    const n = (v: any) => (v === "" || v == null ? 0 : Number(v));
    const body = {
      side: tx.side,
      status: tx.status || "FILLED",
      order_id: tx.order_id || null,
      quantity: n(tx.quantity),
      execution_price: n(tx.execution_price),
      commission: n(tx.commission),
      trading_fee: n(tx.trading_fee),
      clearing_fee: n(tx.clearing_fee),
      regulatory_fee: n(tx.regulatory_fee),
      cat_fee: n(tx.cat_fee),
      sec_fee: n(tx.sec_fee),
      taf_fee: n(tx.taf_fee),
      vat: n(tx.vat),
      fx_rate: tx.fx_rate === "" ? null : n(tx.fx_rate),
      executed_at: tx.executed_at || null,
    };
    if (!body.quantity || !body.execution_price) return alert("กรุณาระบุจำนวนและราคา");
    if (!/^\d+(\.\d{1,7})?$/.test(String(tx.quantity))) return alert("จำนวนหุ้นต้องมีทศนิยมไม่เกิน 7 ตำแหน่ง");
    const idem = tx.idempotency_key || crypto.randomUUID();
    if (!tx.idempotency_key) setTx((v: any) => ({ ...v, idempotency_key: idem }));
    const r = await apiFetch(
      `${API}/api/v1/portfolio/${selected.id}/transactions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idem },
        body: JSON.stringify(body),
      },
    );
    if (!r.ok) return alert("บันทึกรายการไม่สำเร็จ");
    const rr = await apiFetch(
      `${API}/api/v1/portfolio/${selected.id}/transactions`,
    );
    setTxs(rr.ok ? await rr.json() : []);
    reload();
  }
  const groups = [
    ["TH", "หุ้นไทย"],
    ["US", "หุ้นสหรัฐ"],
  ];
  const feeKeys = selected?.market === "TH"
    ? ["commission", "trading_fee", "clearing_fee", "regulatory_fee", "vat"]
    : ["commission", "cat_fee", "sec_fee", "taf_fee", "vat"];
  const fees = feeKeys.reduce((s, k) => s + (Number(tx[k]) || 0), 0);
  return (
    <section className="ms-portfolio-page">
      <div className="ms-card ms-portfolio-toolbar">
        <div className="ms-card-header">
          <div>
            <h2 className="ms-section-title">พอร์ตการลงทุน (Portfolio)</h2>
            <p className="ms-section-subtitle">
              ดูสถานะหุ้น และจัดการรายการซื้อขายแยกเป็นรายหุ้น
            </p>
          </div>
          <button
            className="ms-button"
            onClick={() => {
              setMode("add");
              setF(empty);
            }}
          >
            ＋ เพิ่มหุ้น
          </button>
        </div>
      </div>
      {mode && (
        <div className="ms-stock-detail-overlay" role="dialog" aria-modal="true" aria-label={mode === "edit" ? "แก้ไขหุ้นใน Portfolio" : "เพิ่มหุ้นเข้า Portfolio"}>
          <button className="ms-stock-detail-backdrop" aria-label="ปิด" onClick={reset} />
          <div className="ms-card ms-modal-form ms-portfolio-add-form">
            <div className="ms-modal-form-header">
              <div>
                <span className="ms-market-chip">{mode === "edit" ? "EDIT PORTFOLIO" : "ADD PORTFOLIO"}</span>
                <h2>{mode === "edit" ? "แก้ไขหุ้นใน Portfolio" : "เพิ่มหุ้นเข้า Portfolio"}</h2>
                <p>เลือกตลาดและหุ้นที่ต้องการบันทึกในพอร์ต</p>
              </div>
              <button className="ms-button ms-button-light" onClick={reset} aria-label="ปิด">✕</button>
            </div>
            <div className="ms-modal-form-grid">
          <label>
            ตลาด
            <select
              value={f.market}
              onChange={(e) =>
                setF({
                  ...f,
                  market: e.target.value,
                  currency: e.target.value === "TH" ? "THB" : "USD",
                  symbol: "",
                })
              }
            >
              <option>TH</option>
              <option>US</option>
            </select>
          </label>
          <StockPicker
            market={f.market}
            value={f.symbol}
            onChange={(x) =>
              setF({
                ...f,
                symbol: x.symbol,
                market: x.market,
                currency: x.currency || "THB",
              })
            }
          />
            </div>
          <div className="ms-modal-form-actions">
            <button className="ms-button ms-button-light" onClick={reset}>
              ยกเลิก
            </button>
            <button className="ms-button" onClick={save}>
              {mode === "edit" ? "บันทึก" : "เพิ่มหุ้น"}
            </button>
          </div>
        </div>
      </div>
      )}
      {groups.map(([mk, label]) => {
        const list = rows.filter((x) => x.market === mk);
        return (
          <div
            className="ms-dashboard-market ms-portfolio-market-card"
            key={mk}
          >
            <div className="ms-dashboard-market-head">
              <div>
                <h3>{label}</h3>
                <span>
                  {list.length} รายการ · {mk === "TH" ? "THB" : "USD"}
                </span>
              </div>
            </div>
            <div className="ms-table-wrap">
              <table className="ms-table ms-table-portfolio">
                <thead>
                  <tr>
                    <th>หุ้น (Symbol)</th>
                    <th>จำนวน</th>
                    <th>ราคา (Price)</th>
                    <th>มูลค่า</th>
                    <th>P/L</th>
                    <th>%</th>
                    <th aria-label="จัดการ">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((x) => {
                    const q = quotes.find(
                      (z) => z.market === x.market && z.symbol === x.symbol,
                    );
                    const qty = Number(x.quantity);
                    const price = Number(q?.price || x.average_cost);
                    const avg = Number(x.average_cost);
                    const value = qty * price;
                    const pnl = (price - avg) * qty;
                    const pnlPct = avg > 0 ? (price / avg - 1) * 100 : null;
                    return (
                      <tr key={x.id}>
                        <td>
                          <strong>{x.symbol}</strong>
                        </td>
                        <td>{qty.toLocaleString()}</td>
                        <td>
                          {q
                            ? displayMoney(
                                Number(q.price),
                                q.currency,
                                display,
                                fx,
                              )
                            : money(avg, x.currency)}
                          {q && (
                            <small className="ms-table-sub">
                              {freshnessLabel(q)}
                            </small>
                          )}
                        </td>
                        <td>{displayMoney(value, x.currency, display, fx)}</td>
                        <td
                          className={pnl >= 0 ? "ms-positive" : "ms-negative"}
                        >
                          {displayMoney(pnl, x.currency, display, fx)}
                        </td>
                        <td
                          className={
                            pnlPct == null ? "" : pnlPct >= 0 ? "ms-positive" : "ms-negative"
                          }
                        >
                          {pnlPct == null ? "—" : pct(pnlPct)}
                        </td>
                        <td>
                          <div className="ms-row-menu">
                            <button
                              className="ms-menu-button"
                              onClick={(e) => {
                                if (openMenuId === x.id) {
                                  setOpenMenuId(null);
                                  setMenuPosition(null);
                                  return;
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                const estimatedMenuHeight = 150;
                                const gap = 6;
                                const openUp = rect.bottom + estimatedMenuHeight + gap > window.innerHeight;
                                setOpenMenuId(x.id);
                                setMenuPosition({
                                  top: openUp ? Math.max(12, rect.top - estimatedMenuHeight - gap) : rect.bottom + gap,
                                  right: Math.max(12, window.innerWidth - rect.right),
                                  openUp,
                                });
                              }}
                              aria-label="จัดการรายการ"
                              title="จัดการ"
                            >
                              ⚙
                            </button>
                            {openMenuId === x.id && menuPosition && (
                              <div
                                className={`ms-row-menu-popover ms-floating-menu${menuPosition.openUp ? " open-up" : ""}`}
                                style={{ top: menuPosition.top, right: menuPosition.right }}
                              >
                                <button onClick={() => { setOpenMenuId(null); openTx(x); }}>
                                  ดูรายละเอียด / รายการซื้อขาย
                                </button>
                                <button
                                  onClick={() => {
                                    setMode("edit");
                                    setF({
                                      market: x.market,
                                      symbol: x.symbol,
                                      currency: x.currency,
                                      enabled: x.enabled,
                                      id: x.id,
                                    });
                                    setOpenMenuId(null);
                                    setSelected(null);
                                  }}
                                >
                                  แก้ไข
                                </button>
                                <button
                                  className="danger"
                                  onClick={() => { setOpenMenuId(null); setDeleteTarget(x.id); }}
                                >
                                  ลบ
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!list.length && (
                <Empty
                  text={`ยังไม่มี${label} — กด “เพิ่มหุ้น” เพื่อเริ่มต้น`}
                />
              )}
            </div>
          </div>
        );
      })}
      {selected && (
        <div className="ms-stock-detail-overlay" role="dialog" aria-modal="true" aria-label={`รายละเอียดหุ้น ${selected.symbol}`}>
          <button
            type="button"
            className="ms-stock-detail-backdrop"
            aria-label="ปิดรายละเอียด"
            onClick={() => setSelected(null)}
          />
          <div id="stock-detail-panel" className="ms-transaction-panel ms-stock-detail">
          <div className="ms-card-header">
            <div>
              <span className="ms-market-chip">
                {selected.market === "TH" ? "หุ้นไทย" : "หุ้นสหรัฐ"}
              </span>
              <h3 className="ms-section-title">{selected.symbol}</h3>
              <p className="ms-section-subtitle">รายการซื้อขายของหุ้นตัวนี้</p>
            </div>
            <button
              className="ms-button ms-button-light"
              onClick={() => setSelected(null)}
            >
              ปิด
            </button>
          </div>
          <div className="ms-detail-summary">
            <div>
              <span>จำนวนปัจจุบัน</span>
              <strong>{quantity(selected.quantity)}</strong>
            </div>
            <div>
              <span>ต้นทุนเฉลี่ยต่อหุ้น (Avg Cost)</span>
              <strong>
                {Number(selected.average_cost) > 0
                  ? displayMoney(Number(selected.average_cost), selected.currency, display, fx)
                  : "—"}
              </strong>
              {Number(selected.average_cost) > 0 && (
                <small className="ms-table-sub">
                  Native:{" "}{money(Number(selected.average_cost), selected.currency)}
                </small>
              )}
            </div>
            <div>
              <span>รายการซื้อขาย</span>
              <strong>{txs.length} รายการ</strong>
            </div>
          </div>
          <div className="ms-card-header ms-history-header">
            <div>
              <h3 className="ms-section-title">รายการซื้อขาย</h3>
              <p className="ms-section-subtitle">
                ซื้อ / ขาย โดยกรอกเฉพาะข้อมูลที่จำเป็น
              </p>
            </div>
            <button
              className="ms-button"
              onClick={() => {
                setTx({
                  ...tx,
                  side: "BUY",
                  status: "FILLED",
                  quantity: "",
                  execution_price: "",
                  order_id: "",
                  idempotency_key: crypto.randomUUID(),
                  fx_rate: selected.currency === "USD" && fx ? String(fx) : "",
                  executed_at: "",
                });
                setShowFees(false);
              }}
            >
              ＋ เพิ่มรายการ
            </button>
          </div>
          <div className="ms-trade-form ms-detail-trade">
            <div className="ms-side-toggle">
              <button
                aria-label="ซื้อ (BUY)"
                className={tx.side === "BUY" ? "active buy" : ""}
                onClick={() => setTx({ ...tx, side: "BUY" })}
              >
                ซื้อ (BUY)
              </button>
              <button
                aria-label="ขาย (SELL)"
                className={tx.side === "SELL" ? "active sell" : ""}
                onClick={() => setTx({ ...tx, side: "SELL" })}
              >
                ขาย (SELL)
              </button>
            </div>
            <label>
              จำนวน
              <input
                type="number"
                value={tx.quantity}
                onChange={(e) => setTx({ ...tx, quantity: e.target.value })}
              />
            </label>
            <label>
              {tx.side === "BUY" ? "ราคาซื้อ (Execution Price)" : "ราคาขาย (Execution Price)"}
              <input
                type="number"
                value={tx.execution_price}
                onChange={(e) =>
                  setTx({ ...tx, execution_price: e.target.value })
                }
              />
            </label>
            <label>
              เวลาที่ทำรายการ
              <input
                type="datetime-local"
                value={tx.executed_at ? tx.executed_at.slice(0, 16) : ""}
                onChange={(e) =>
                  setTx({
                    ...tx,
                    executed_at: e.target.value ? e.target.value + ":00" : "",
                  })
                }
              />
            </label>
            <label>
              รหัสคำสั่งซื้อขาย (Order ID) <span className="ms-optional">(ถ้ามี)</span>
              <input
                value={tx.order_id}
                onChange={(e) => setTx({ ...tx, order_id: e.target.value })}
              />
            </label>
            <label>
              สถานะรายการ (Order Status)
              <select value={tx.status} onChange={(e) => setTx({ ...tx, status: e.target.value })}>
                <option value="FILLED">ดำเนินการแล้ว (FILLED) · จับคู่แล้ว</option>
                <option value="PENDING">รอดำเนินการ (PENDING) · รอจับคู่</option>
                <option value="CANCELLED">ยกเลิก (CANCELLED)</option>
              </select>
            </label>
            {selected.currency === "USD" && (
              <label>
                อัตราแลกเปลี่ยน (FX Rate) <span className="ms-optional">(THB / USD)</span>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={tx.fx_rate}
                  onChange={(e) => setTx({ ...tx, fx_rate: e.target.value })}
                />
                <small className="ms-table-sub">อ้างอิง {fx ? `1 USD = ${Number(fx).toFixed(4)} THB` : "ไม่มี FX ล่าสุด"}</small>
              </label>
            )}
            <div className="ms-trade-calculated">
              <div>
                <span>มูลค่ารายการ (Trading Value)</span>
                <strong>
                  {money(
                    (Number(tx.quantity) || 0) *
                      (Number(tx.execution_price) || 0),
                    selected.currency,
                  )}
                </strong>
              </div>
              <div>
                <span>ค่าธรรมเนียม (Fees)</span>
                <strong>{money(fees, selected.currency)}</strong>
              </div>
              <div>
                <span>ยอดสุทธิ (Net Amount)</span>
                <strong>
                  {money(
                    (Number(tx.quantity) || 0) *
                      (Number(tx.execution_price) || 0) +
                      (tx.side === "BUY" ? fees : -fees),
                    selected.currency,
                  )}
                </strong>
              </div>
            </div>
            <button className="ms-button" onClick={saveTx}>
              บันทึก
            </button>
          </div>
          <div className="ms-detail-edit">
            <button
              type="button"
              className="ms-fee-toggle"
              onClick={() => setShowFees((v) => !v)}
            >
              ▸ ค่าธรรมเนียม / ภาษี{" "}
              <span>{showFees ? "ซ่อน" : "รายละเอียดเพิ่มเติม"}</span>
            </button>
            {showFees && (
              <div className="ms-fee-panel">
                <div className="ms-fee-title">
                  ค่าธรรมเนียม / ภาษี (Fees / Tax){" "}
                  <span className="ms-optional">(ทั้งหมด Optional)</span>
                </div>
                <div className="ms-fee-grid">
                  {[
                    ["commission", "ค่าคอมมิชชัน (Commission)"],
                    [
                      "trading_fee",
                      selected.market === "TH"
                        ? "ค่าธรรมเนียมการซื้อขาย (SET Trading Fee)"
                        : "ค่าธรรมเนียมการซื้อขาย (Trading Fee)",
                    ],
                    [
                      "clearing_fee",
                      selected.market === "TH"
                        ? "ค่าธรรมเนียมชำระราคา (TSD Clearing Fee)"
                        : "ค่าธรรมเนียมชำระราคา (Clearing Fee)",
                    ],
                    ["regulatory_fee", "ค่าธรรมเนียมตามกฎระเบียบ (Regulatory Fee)"],
                    ["cat_fee", "ค่าธรรมเนียม CAT (CAT Fee)"],
                    ["sec_fee", "ค่าธรรมเนียม SEC (SEC Fee)"],
                    ["taf_fee", "ค่าธรรมเนียม TAF (TAF Fee)"],
                    ["vat", "ภาษี / VAT (VAT / Tax)"],
                    ["fx_rate", "อัตราแลกเปลี่ยน (FX Rate)"],
                  ].map(([k, l]) => (
                    <label key={k}>
                      {l}
                      <input
                        type="number"
                        step="any"
                        value={tx[k]}
                        onChange={(e) => setTx({ ...tx, [k]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
                <p className="ms-fee-hint">
                  ช่องทั้งหมดเป็น Optional · ซื้อ (BUY) = มูลค่า + ค่าธรรมเนียม · ขาย (SELL)
                  = มูลค่า − ค่าธรรมเนียม
                </p>
              </div>
            )}
          </div>
          <div className="ms-table-wrap">
            {txs.length === 0 ? (
              <Empty text="ยังไม่มีรายการซื้อขาย — กด “＋ เพิ่มรายการ” เพื่อบันทึกรายการแรก" />
            ) : (
              <div className="ms-history-list">
                {txs.map((x) => (
                  <div className="ms-history-block" key={x.id}>
                    <strong>{x.side}</strong>
                    <span className={`ms-status-badge ms-status-${String(x.status || "FILLED").toLowerCase()}`}>{transactionStatusLabel(x.status || "FILLED")}</span>
                    <span>{String(x.executed_at || "—").slice(0, 10)}</span>
                    <span>
                      {quantity(x.quantity)} ×{" "}
                      {money(x.execution_price, selected.currency)}
                    </span>
                    <span>
                      {money(Number(x.net_amount || 0), selected.currency)}
                      {x.net_amount_thb != null && selected.currency !== "THB" ? ` · ${money(Number(x.net_amount_thb), "THB")}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {txs.some((x) => String(x.status).toUpperCase() === "CANCELLED") && (
            <div className="ms-banner ms-banner-warning">⚠ รายการยกเลิก (CANCELLED) จะไม่ถูกนำไปคำนวณจำนวนหุ้นที่ถืออยู่ (Holdings), ต้นทุนสะสม (Cost Basis) หรือต้นทุนเฉลี่ยต่อหุ้น (Average Cost)</div>
          )}
          </div>
        </div>
      )}
      {deleteTarget && (
        <ConfirmDialog
          title={`ลบ ${rows.find((x) => x.id === deleteTarget)?.symbol || "หุ้น"} ออกจาก Portfolio?`}
          description="ข้อมูล Portfolio จะถูกลบ แต่ประวัติการซื้อขายจะยังคงอยู่"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await remove(deleteTarget);
            setDeleteTarget(null);
          }}
        />
      )}
    </section>
  );
}
function ConfirmDialog({
  title,
  description,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="ms-dialog-backdrop">
      <div className="ms-dialog">
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="ms-actions">
          <button className="ms-button ms-button-light" onClick={onCancel}>
            ยกเลิก
          </button>
          <button className="ms-button ms-danger-button" onClick={onConfirm}>
            ลบ
          </button>
        </div>
      </div>
    </div>
  );
}
function Form({ children }: { children: React.ReactNode }) {
  return <div className="ms-form-row">{children}</div>;
}
function Watchlist({
  rows,
  quotes,
  reload,
}: {
  rows: Watch[];
  quotes: Quote[];
  reload: () => void;
}) {
  const empty = {
    market: "TH",
    symbol: "",
    upper_percent: "",
    lower_percent: "",
    upper_price: "",
    lower_price: "",
    enabled: true,
  };
  const [f, setF] = useState<any>(empty);
  const [upperMode, setUpperMode] = useState<"percent" | "price">("percent");
  const [lowerMode, setLowerMode] = useState<"percent" | "price">("percent");
  const [edit, setEdit] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false),
    [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  async function save() {
    // The active condition is determined by the value the user entered.
    // Do not rely on the mode state here: entering a price clears the percent field,
    // and vice versa. This keeps the UI validation in sync with the actual form data.
    const hasUpper = f.upper_percent !== "" || f.upper_price !== "";
    const hasLower = f.lower_percent !== "" || f.lower_price !== "";
    if (!hasUpper && !hasLower) return alert("กรุณากำหนดเงื่อนไขแจ้งเตือนอย่างน้อย 1 รายการ");
    const body = {
      ...f,
      upper_percent: f.upper_percent !== "" ? Number(f.upper_percent) : null,
      lower_percent: f.lower_percent !== "" ? Number(f.lower_percent) : null,
      upper_price: f.upper_price !== "" ? Number(f.upper_price) : null,
      lower_price: f.lower_price !== "" ? Number(f.lower_price) : null,
    };
    const editing = Boolean(edit && edit !== "new");
    const r = await apiFetch(
      editing ? API + "/api/v1/watchlist/" + edit : API + "/api/v1/watchlist",
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!r.ok) return alert("บันทึก Watchlist ไม่สำเร็จ");
    setF(empty);
    setEdit(null);
    setShowForm(false);
    reload();
  }
  async function remove(id: string) {
    const r = await apiFetch(API + "/api/v1/watchlist/" + id, {
      method: "DELETE",
    });
    if (r.ok) reload();
  }
  return (
    <section className="ms-card">
      <div className="ms-card-header">
        <div>
          <h2 className="ms-section-title">รายการติดตาม (Watchlist)</h2>
          <p className="ms-section-subtitle">
            ติดตามราคาและตั้งแจ้งเตือนแบบเปอร์เซ็นต์หรือราคา
          </p>
        </div>
        <button
          className="ms-button"
          onClick={() => {
            setEdit("new");
            setF(empty);
            setShowForm(true);
          }}
        >
          ＋ เพิ่ม Watchlist
        </button>
      </div>
      {showForm && typeof document !== "undefined" && createPortal(
        <div className="ms-stock-detail-overlay ms-watchlist-modal-overlay" role="dialog" aria-modal="true" aria-label={edit === "new" ? "เพิ่ม Watchlist" : "แก้ไข Watchlist"}>
          <button className="ms-stock-detail-backdrop" aria-label="ปิด" onClick={() => { setEdit(null); setF(empty); setShowForm(false); }} />
          <div className="ms-card ms-modal-form ms-watchlist-modal">
            <div className="ms-modal-form-header">
              <div>
                <span className="ms-market-chip">{edit === "new" ? "ADD WATCHLIST" : "EDIT WATCHLIST"}</span>
                <h2>{edit === "new" ? "เพิ่ม Watchlist" : "แก้ไข Watchlist"}</h2>
                <p>เลือกหุ้นและกำหนดเงื่อนไขแจ้งเตือนราคา</p>
              </div>
              <button className="ms-button ms-button-light" onClick={() => { setEdit(null); setF(empty); setShowForm(false); }} aria-label="ปิด">✕</button>
            </div>
          <Form>
            <StockPicker
              market={f.market}
              value={f.symbol}
              onChange={(x) =>
                setF({ ...f, symbol: x.symbol, market: x.market })
              }
              onMarketChange={(nextMarket) =>
                setF({ ...f, market: nextMarket, symbol: "" })
              }
            />
            <div className="ms-watch-alert-group">
              <div className="ms-watch-alert-title">แจ้งเตือนเมื่อ</div>
              <div className="ms-watch-alert-row">
                <label>
                  ขึ้นถึง <span className="ms-optional">(%)</span>
                  <input
                    type="number"
                    placeholder="+7"
                    value={f.upper_percent}
                    disabled={f.upper_price !== ""}
                    onChange={(e) =>
                      setF({ ...f, upper_percent: e.target.value, upper_price: "" })
                    }
                  />
                </label>
                <label>
                  ราคา <span className="ms-optional">(Upper)</span>
                  <input
                    type="number"
                    placeholder="เช่น 38.00"
                    value={f.upper_price}
                    disabled={f.upper_percent !== ""}
                    onChange={(e) =>
                      setF({ ...f, upper_price: e.target.value, upper_percent: "" })
                    }
                  />
                </label>
              </div>
              <div className="ms-watch-alert-row">
                <label>
                  ลงถึง <span className="ms-optional">(%)</span>
                  <input
                    type="number"
                    placeholder="-7"
                    value={f.lower_percent}
                    disabled={f.lower_price !== ""}
                    onChange={(e) =>
                      setF({ ...f, lower_percent: e.target.value, lower_price: "" })
                    }
                  />
                </label>
                <label>
                  ราคา <span className="ms-optional">(Lower)</span>
                  <input
                    type="number"
                    placeholder="เช่น 32.00"
                    value={f.lower_price}
                    disabled={f.lower_percent !== ""}
                    onChange={(e) =>
                      setF({ ...f, lower_price: e.target.value, lower_percent: "" })
                    }
                  />
                </label>
              </div>
            </div>
            <div className="ms-actions">
              <button
                className="ms-button ms-button-light"
                onClick={() => {
                  setEdit(null);
                  setF(empty);
                  setShowForm(false);
                }}
              >
                ยกเลิก
              </button>
              <button className="ms-button" onClick={save}>
                {edit === "new" ? "＋ เพิ่ม Watchlist" : "บันทึกการแก้ไข"}
              </button>
            </div>
          </Form>
          </div>
        </div>,
        document.body,
      )}
      <WatchTable
        rows={rows}
        editable
        onEdit={(x) => {
          setEdit(x.id);
          setF({
            ...x,
            upper_percent: x.upper_percent || "",
            lower_percent: x.lower_percent || "",
            upper_price: x.upper_price || "",
            lower_price: x.lower_price || "",
          });
          setShowForm(true);
        }}
        onDelete={(id) => setDeleteTarget(id)}
      />
      {deleteTarget && (
        <ConfirmDialog
          title="ลบ Watchlist นี้?"
          description="หุ้นและเงื่อนไขการติดตามรายการนี้จะถูกลบ"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await remove(deleteTarget);
            setDeleteTarget(null);
          }}
        />
      )}
    </section>
  );
}
function Alerts({ rows, quotes }: { rows: Alert[]; quotes: Quote[] }) {
  return (
    <section className="ms-card">
      <div className="ms-card-header">
        <div>
          <h2 className="ms-section-title">การแจ้งเตือน (Alerts)</h2>
          <p className="ms-section-subtitle">
            ประวัติการแจ้งเตือน พร้อมเวลาส่งและสถานะล่าสุด
          </p>
        </div>
      </div>
      <div className="ms-alert-summary">
        <span>
          ทั้งหมด <strong>{rows.length}</strong>
        </span>
        <span>
          ส่งแล้ว (Delivered){" "}
          <strong>{rows.filter((x) => x.status === "delivered").length}</strong>
        </span>
        <span>
          ส่งไม่สำเร็จ (Failed){" "}
          <strong>{rows.filter((x) => x.status === "failed").length}</strong>
        </span>
      </div>
      <div className="ms-table-wrap">
        <table className="ms-table ms-table-alerts">
          <thead>
            <tr>
              <th>เวลา (Time)</th>
              <th>หุ้น (Symbol)</th>
              <th>
                <span>{GLOSSARY.alert.label}</span>{" "}
                <Tooltip label="อธิบายเงื่อนไขแจ้งเตือน">{GLOSSARY.alert.help}</Tooltip>
              </th>
              <th>ราคา (Price)</th>
              <th>การเปลี่ยนแปลงของราคา (%)</th>
              <th>สถานะการส่ง (Delivery)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const q = quotes.find(
                (z) => z.market === x.market && z.symbol === x.symbol,
              );
              const statusClass =
                x.status === "delivered"
                  ? "sent"
                  : x.status === "failed"
                    ? "failed"
                    : "pending";
              const deliveryHelp = alertDeliveryHelp(x.status, x.message);
              return (
                <tr key={x.id}>
                  <td>
                    <strong>
                      {new Date(x.triggered_at).toLocaleDateString("th-TH", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </strong>
                    <small className="ms-table-sub">
                      {new Date(x.triggered_at).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </td>
                  <td>
                    <strong>{x.symbol}</strong>
                    <small className="ms-table-sub">{x.market}</small>
                  </td>
                  <td>{alertLabel(x.alert_type)}</td>
                  <td>
                    {x.trigger_price != null
                      ? money(Number(x.trigger_price), q?.currency || "")
                      : q
                        ? money(Number(q.price), q.currency)
                        : "—"}
                  </td>
                  <td
                    className={
                      Number(x.change_percent) >= 0
                        ? "ms-positive"
                        : "ms-negative"
                    }
                  >
                    {pct(x.change_percent)}
                  </td>
                  <td>
                    <span className={`ms-alert-status ${statusClass}`}>
                      {statusLabel(x.status)}
                    </span>
                    <small className="ms-table-sub">{deliveryHelp.text}</small>
                    <small className="ms-table-sub">ถัดไป: {deliveryHelp.action}</small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && (
          <Empty text="ยังไม่มีประวัติการแจ้งเตือน — เมื่อ Alert ทำงาน ประวัติจะแสดงที่นี่" />
        )}
      </div>
    </section>
  );
}

function Settings({
  rows,
  reload,
  stockStatus,
  fx,
}: {
  rows: Setting[];
  reload: () => void;
  stockStatus: any;
  fx: any;
}) {
  const defaults: any = {
    refresh_interval: 30,
    notifications_enabled: true,
    alert_on_open: true,
    alert_on_close: true,
    line_enabled: false,
    display_currency: "native",
    number_format: "standard",
  };
  const merged: any = { ...defaults };
  rows.forEach((x) => (merged[x.key] = x.value));
  const [busy, setBusy] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const fmt = (v: any) =>
    v
      ? new Date(v).toLocaleString("th-TH", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";
  async function save(k: string, v: any) {
    const r = await apiFetch(`${API}/api/v1/settings/${k}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: v }),
    });
    if (r.ok) reload();
    else alert("บันทึกไม่สำเร็จ");
  }
  async function syncStocks() {
    setBusy("stocks");
    setSyncMessage("");
    try {
      const r = await apiFetch(`${API}/api/v1/market/stocks/sync`, {
        method: "POST",
      });
      const data = await r.json().catch(() => null);
      setSyncMessage(
        r.ok
          ? `✓ อัปเดตแล้ว ${data?.updated || 0} รายการ · เพิ่มใหม่ ${data?.added || 0}`
          : "⚠ อัปเดตข้อมูลหุ้นไม่สำเร็จ",
      );
      if (r.ok) reload();
    } catch {
      setSyncMessage("⚠ ไม่สามารถเชื่อมต่อเพื่ออัปเดตข้อมูลหุ้นได้");
    } finally {
      setBusy("");
    }
  }
  async function syncFx() {
    setBusy("fx");
    setSyncMessage("");
    try {
      const r = await apiFetch(`${API}/api/v1/fx/usd-thb/sync`, {
        method: "POST",
      });
      const data = await r.json().catch(() => null);
      setSyncMessage(
        r.ok
          ? `✓ USD/THB อัปเดตแล้ว · แหล่งข้อมูล ${data?.source || "Primary"}`
          : "⚠ อัปเดต FX ไม่สำเร็จ",
      );
      if (r.ok) reload();
    } catch {
      setSyncMessage("⚠ ไม่สามารถเชื่อมต่อเพื่ออัปเดต FX ได้");
    } finally {
      setBusy("");
    }
  }
  const fxStale = Boolean(fx?.stale);
  return (
    <section className="ms-settings-page">
      <div className="ms-card ms-settings-card">
        <h2 className="ms-section-title">Settings</h2>
        <div className="ms-settings-group">
          <h3>การแจ้งเตือน</h3>
          <label className="ms-setting">
            <span>เปิด/ปิดแจ้งเตือน</span>
            <input
              type="checkbox"
              checked={Boolean(merged.notifications_enabled)}
              onChange={(e) => save("notifications_enabled", e.target.checked)}
            />
          </label>
          <label className="ms-setting">
            <span>แจ้งตอนตลาดเปิด</span>
            <input
              type="checkbox"
              checked={Boolean(merged.alert_on_open)}
              onChange={(e) => save("alert_on_open", e.target.checked)}
            />
          </label>
          <label className="ms-setting">
            <span>แจ้งตอนตลาดปิด</span>
            <input
              type="checkbox"
              checked={Boolean(merged.alert_on_close)}
              onChange={(e) => save("alert_on_close", e.target.checked)}
            />
          </label>
          <label className="ms-setting">
            <span>LINE</span>
            <input
              type="checkbox"
              checked={Boolean(merged.line_enabled)}
              onChange={(e) => save("line_enabled", e.target.checked)}
            />
          </label>
        </div>
        <div className="ms-settings-group">
          <h3>การแสดงผล</h3>
          <label className="ms-setting">
            <span>รีเฟรชข้อมูล</span>
            <select
              value={merged.refresh_interval}
              onChange={(e) => save("refresh_interval", Number(e.target.value))}
            >
              <option value="15">15 วินาที</option>
              <option value="30">30 วินาที</option>
              <option value="60">60 วินาที</option>
            </select>
          </label>
          <label className="ms-setting">
            <span>สกุลเงิน</span>
            <select
              value={merged.display_currency}
              onChange={(e) => save("display_currency", e.target.value)}
            >
              <option value="native">Native (THB / USD)</option>
              <option value="THB">แสดงเป็น THB</option>
              <option value="USD">แสดงเป็น USD</option>
            </select>
          </label>
          <label className="ms-setting">
            <span>รูปแบบตัวเลข</span>
            <select
              value={merged.number_format}
              onChange={(e) => save("number_format", e.target.value)}
            >
              <option value="standard">1,234.56</option>
              <option value="compact">1.23K / 1.23M</option>
            </select>
          </label>
          <div className="ms-fx-status">
            <div>
              <span>USD / THB</span>
              <strong>{fx?.rate ? Number(fx.rate).toFixed(4) : "—"}</strong>
            </div>
            <div>
              <small>
                {fxStale
                  ? "⚠ อัตราแลกเปลี่ยนอาจล้าสมัย"
                  : `อัปเดต ${fmt(fx?.quoted_at)}`}
              </small>
              <small>แหล่งข้อมูล: {fx?.source || "—"}</small>
            </div>
          </div>
          <button
            className="ms-button ms-button-light"
            onClick={syncFx}
            disabled={busy === "fx"}
          >
            ↻ {busy === "fx" ? "กำลังอัปเดต..." : "อัปเดต FX"}
          </button>
        </div>
        <div className="ms-settings-group">
          <h3>ระบบข้อมูล</h3>
          <div className="ms-data-row">
            <span>Stock Master</span>
            <strong>
              {Number(stockStatus?.total || 0).toLocaleString()} หุ้น
            </strong>
          </div>
          <div className="ms-data-row">
            <span>ตลาดไทย / สหรัฐ</span>
            <strong>
              {Number(stockStatus?.TH || 0)} / {Number(stockStatus?.US || 0)}
            </strong>
          </div>
          <div className="ms-data-row">
            <span>อัปเดตล่าสุด</span>
            <strong>{fmt(stockStatus?.last_synced_at)}</strong>
          </div>
          <div className="ms-data-row">
            <span>Quote Cache</span>
            <strong>ข้อมูลที่เก่ากว่า 5 นาทีจะแสดงเป็นล่าช้า</strong>
          </div>
          <button
            className="ms-button ms-button-light"
            onClick={syncStocks}
            disabled={busy === "stocks"}
          >
            ↻ {busy === "stocks" ? "กำลังอัปเดต..." : "อัปเดต Stock Master"}
          </button>
          {syncMessage && <div className="ms-sync-result">{syncMessage}</div>}
        </div>
        <DataManagement />
      </div>
    </section>
  );
}

function DataManagement() {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [selected, setSelected] = useState<{kind: "portfolio" | "transactions"; file: File} | null>(null);
  const download = async (path: string, fallback: string) => {
    setBusy(path); setMessage("");
    try {
      const r = await apiFetch(`${API}${path}`);
      if (!r.ok) throw new Error();
      const blob = await r.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = fallback; a.click(); URL.revokeObjectURL(url);
      setMessage("✓ ดาวน์โหลดไฟล์เรียบร้อย");
    } catch { setMessage("⚠ ดาวน์โหลดไม่สำเร็จ"); } finally { setBusy(""); }
  };
  const choose = async (kind: "portfolio" | "transactions", file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) { setMessage("⚠ รองรับเฉพาะไฟล์ .xlsx"); return; }
    setBusy(`preview-${kind}`); setMessage(""); setPreview(null); setSelected({kind, file});
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await apiFetch(`${API}/api/v1/data/import/${kind}/preview`, {method:"POST", body:fd});
      const data = await r.json(); if (!r.ok) throw new Error(data.detail || "Preview failed");
      setPreview(data);
      setMessage(data.errors?.length ? `⚠ พบข้อผิดพลาด ${data.errors.length} รายการ` : `✓ ตรวจสอบผ่าน ${data.valid || 0} แถว`);
    } catch (e:any) { setMessage(`⚠ ${e.message || "ตรวจสอบไฟล์ไม่สำเร็จ"}`); setSelected(null); } finally { setBusy(""); }
  };
  const commit = async () => {
    if (!selected || preview?.errors?.length) return;
    setBusy(`import-${selected.kind}`);
    try {
      const fd = new FormData(); fd.append("file", selected.file);
      const r = await apiFetch(`${API}/api/v1/data/import/${selected.kind}`, {method:"POST", body:fd});
      const data = await r.json(); if (!r.ok) throw new Error(data.detail || "Import failed");
      setMessage(`✓ นำเข้าสำเร็จ ${data.imported || 0} รายการ · ข้ามซ้ำ ${data.skipped || 0} · ผิดพลาด ${data.failed || 0}`);
      setPreview(data); setSelected(null);
      window.dispatchEvent(new Event("mystockalert:reload"));
    } catch (e:any) { setMessage(`⚠ ${e.message || "นำเข้าไม่สำเร็จ"}`); } finally { setBusy(""); }
  };
  const downloadErrors = () => {
    if (!preview?.errors?.length) return;
    const esc=(v:any)=>`"${String(v).replaceAll('"','""')}"`;
    const csv=["row,message",...preview.errors.map((x:any)=>`${x.row},${esc(x.message)}`)].join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="MyStockAlert_Import_Errors.csv"; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="ms-settings-group">
      <h3>Data Management</h3>
      <p className="ms-muted">ส่งออกข้อมูลเป็น Excel หรือเตรียมไฟล์ Excel เพื่อนำเข้า โดยระบบจะตรวจสอบก่อนบันทึกจริง</p>
      <div className="ms-data-row"><span>Portfolio</span><div className="ms-button-row">
        <button className="ms-button ms-button-light" onClick={()=>download("/api/v1/data/export/portfolio","MyStockAlert_Portfolio.xlsx")} disabled={!!busy}>Export Portfolio</button>
        <button className="ms-button ms-button-light" onClick={()=>download("/api/v1/data/template/portfolio","MyStockAlert_Portfolio_Template.xlsx")} disabled={!!busy}>Portfolio Template</button>
        <label className="ms-button ms-button-light">Import Portfolio<input hidden type="file" accept=".xlsx" onChange={e=>choose("portfolio",e.target.files?.[0])}/></label>
      </div></div>
      <div className="ms-data-row"><span>Transactions</span><div className="ms-button-row">
        <button className="ms-button ms-button-light" onClick={()=>download("/api/v1/data/export/transactions","MyStockAlert_Transactions.xlsx")} disabled={!!busy}>Export Transactions</button>
        <button className="ms-button ms-button-light" onClick={()=>download("/api/v1/data/template/transactions","MyStockAlert_Transactions_Template.xlsx")} disabled={!!busy}>Transactions Template</button>
        <label className="ms-button ms-button-light">Import Transactions<input hidden type="file" accept=".xlsx" onChange={e=>choose("transactions",e.target.files?.[0])}/></label>
      </div></div>
      {preview && <div className="ms-import-preview">
        <strong>Preview · {preview.total || 0} แถว</strong>
        <span>ผ่าน {preview.valid || 0}</span><span>ผิดพลาด {preview.errors?.length || 0}</span><span>คำเตือน {preview.warnings?.length || 0}</span>
        {preview.warnings?.slice(0,5).map((x:any,i:number)=><small key={`w${i}`}>⚠ แถว {x.row}: {x.message}</small>)}
        {preview.errors?.slice(0,8).map((x:any,i:number)=><small key={`e${i}`}>✕ แถว {x.row}: {x.message}</small>)}
        <div className="ms-button-row">
          {preview.errors?.length > 0 && <button className="ms-button ms-button-light" onClick={downloadErrors}>ดาวน์โหลด Error Report</button>}
          {selected && !preview.errors?.length && <button className="ms-button ms-button-primary" onClick={commit} disabled={!!busy}>{busy ? "กำลังนำเข้า..." : "ยืนยัน Import"}</button>}
        </div>
      </div>}
      {message && <div className="ms-sync-result">{message}</div>}
    </div>
  );
}

function SystemStatus({
  system,
  providers,
}: {
  system: any;
  providers: any[];
}) {
  const providerRows = (providers || []).map((x: any) => ({
    name: x.market === "TH" ? "Thailand Market Data" : "US Market Data",
    description: `${String(x.provider || "Provider").toUpperCase()} · ${x.latency_ms != null ? `${Number(x.latency_ms).toFixed(0)} ms` : "ไม่มีข้อมูล latency"}`,
    ok: x.ok !== false,
    detail:
      x.ok === false
        ? x.error || "ไม่สามารถเชื่อมต่อ provider ได้"
        : "พร้อมให้บริการ",
  }));
  const services = [
    {
      name: "Database",
      description: "ฐานข้อมูล Portfolio, Watchlist และ Alert",
      ok: Boolean(system?.database),
      detail: system?.database
        ? "เชื่อมต่อฐานข้อมูลได้"
        : "ไม่สามารถเชื่อมต่อฐานข้อมูล",
    },
    {
      name: "Quote Cache",
      description: "แคชราคาหุ้นล่าสุด",
      ok: true,
      detail: `${system?.quote_cache ?? 0} รายการใน cache`,
    },
    {
      name: "Alert Delivery",
      description: "คิวสำหรับส่งการแจ้งเตือน",
      ok: true,
      detail: `รอส่ง ${system?.pending_deliveries ?? 0} รายการ`,
    },
    ...providerRows,
  ];
  const down = services.filter((x) => !x.ok).length;
  return (
    <section className="ms-system-page">
      <div className="ms-card ms-status-summary">
        <div>
          <span className="ms-status-overline">CURRENT STATUS</span>
          <h2 className="ms-section-title">
            {down ? "มีบริการที่ต้องตรวจสอบ" : "ระบบทำงานปกติ"}
          </h2>
          <p className="ms-section-subtitle">
            {down
              ? `${down} service${down > 1 ? "s" : ""} มีปัญหา`
              : "ทุก service พร้อมให้บริการ"}{" "}
            · Version {system?.version || "—"}
          </p>
        </div>
        <span
          className={`ms-status-overall ${down ? "attention" : "operational"}`}
        >
          <i /> {down ? "มีปัญหา" : "Operational"}
        </span>
      </div>
      <div className="ms-card ms-status-services">
        <div className="ms-card-header">
          <div>
            <h2 className="ms-section-title">Services</h2>
            <p className="ms-section-subtitle">
              สถานะแยกตามบริการ เหมือนรูปแบบ Status Page
            </p>
          </div>
        </div>
        <div className="ms-status-list">
          {services.map((x, i) => (
            <div className="ms-status-service" key={`${x.name}-${i}`}>
              <span className="ms-status-icon">
                <i className={x.ok ? "operational" : "down"} />
              </span>
              <div className="ms-status-info">
                <strong>{x.name}</strong>
                <span>{x.description}</span>
              </div>
              <div className={`ms-status-detail ${x.ok ? "" : "down"}`}>
                {x.detail}
              </div>
              <span
                className={`ms-status-pill ${x.ok ? "operational" : "down"}`}
              >
                {x.ok ? "Operational" : "Unavailable"}
              </span>
            </div>
          ))}
        </div>
        <div className="ms-system-note">
          สถานะนี้อ้างอิงจาก API ของระบบ ณ เวลาที่โหลดหน้า
        </div>
      </div>
    </section>
  );
}

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [registerMode, setRegisterMode] = useState(false);
  const [account, setAccount] = useState("");
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setMessage("");
    if (!account.trim() || !secret) { setMessage("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน"); return; }
    setBusy(true);
    try {
      const endpoint = registerMode ? "register" : "login";
      const r = await apiFetch(`${API}/api/v1/auth/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: account.trim(), password: secret }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setMessage(body.detail === "username already exists" ? "ชื่อผู้ใช้นี้มีอยู่แล้ว" : registerMode ? "สมัครสมาชิกไม่สำเร็จ" : "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      setSecret(""); onSuccess();
    } finally { setBusy(false); }
  };
  return (
    <div className="ms-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="ms-card ms-card-body" style={{ width: "min(420px, 92vw)" }}>
        <div className="ms-brand">
          <div className="ms-brand-mark">MS</div>
          <div><strong>MyStockAlert</strong><small>Secure Portfolio Monitor</small></div>
        </div>
        <h2>{registerMode ? "สร้างบัญชีใหม่" : "เข้าสู่ระบบ"}</h2>
        <p>{registerMode ? "สร้างบัญชีเพื่อแยกข้อมูลพอร์ตและการแจ้งเตือนของคุณ" : "เข้าสู่ระบบเพื่อดูพอร์ตและการแจ้งเตือนของคุณ"}</p>
        {message && <div className="ms-banner ms-banner-error">{message}</div>}
        <label className="ms-field-label">ชื่อผู้ใช้<input value={account} onChange={(e) => setAccount(e.target.value)} autoComplete="username" /></label>
        <label className="ms-field-label">รหัสผ่าน<input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete={registerMode ? "new-password" : "current-password"} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} /></label>
        <button className="ms-button ms-button-primary" onClick={submit} disabled={busy}>{busy ? "กำลังดำเนินการ..." : registerMode ? "สร้างบัญชีและเข้าใช้งาน" : "เข้าสู่ระบบ"}</button>
        <button className="ms-auth-switch" onClick={() => { setRegisterMode(!registerMode); setMessage(""); }}>{registerMode ? "มีบัญชีแล้ว · เข้าสู่ระบบ" : "ยังไม่มีบัญชี · สร้างบัญชี"}</button>
        <small className="ms-auth-note">สมัครสมาชิกแบบง่าย ไม่ต้องยืนยันอีเมล</small>
      </div>
    </div>
  );
}
