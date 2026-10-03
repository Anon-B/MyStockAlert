"use client";
import { useEffect, useMemo, useState } from "react";

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
const NAV: { [k: string]: string } = {
  dashboard: "Dashboard",
  portfolio: "Portfolio",
  watchlist: "Watchlist",
  alerts: "Alerts",
  settings: "Settings",
};
const pct = (v: number | null | string) =>
  v == null ? "—" : `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`;
const money = (v: number | null, c = "") =>
  v == null
    ? "—"
    : `${c} ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const alertLabel = (t: string) =>
  (
    ({
      watchlist_upper: "ถึงเป้าหมายด้านบน",
      watchlist_lower: "ถึงเป้าหมายด้านล่าง",
      portfolio_open_TH: "ตลาดไทยเปิด",
      portfolio_close_TH: "ตลาดไทยปิด",
      portfolio_open_US: "ตลาดสหรัฐเปิด",
      portfolio_close_US: "ตลาดสหรัฐปิด",
    }) as any
  )[t] || t;
const statusLabel = (s: string) =>
  s === "delivered"
    ? "ส่งแล้ว"
    : s === "failed"
      ? "ส่งไม่สำเร็จ"
      : s === "retrying"
        ? "กำลังลองส่งใหม่"
        : "กำลังส่ง";
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
    [fx, setFx] = useState<any>(null);
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
        paths.map((x) => fetch(`${API}/api/v1/${x}`)),
      );
      if (rs.some((x) => !x.ok)) throw Error("API");
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
      setError("เชื่อมต่อ API ไม่สำเร็จ");
    } finally {
      if (!silent) setLoading(false);
    }
  }
  useEffect(() => {
    load();
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
              {darkPremium ? "☼ Light Glass" : "◐ Dark Premium"}
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
    fetch(`${API}/api/v1/fx/usd-thb`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setFx)
      .catch(() => {});
  }, []);
  return (
    <div className="ms-fx-mini">
      <span>USD/THB</span>
      <strong>{fx?.rate ? Number(fx.rate).toFixed(4) : "—"}</strong>
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
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <article className="ms-card ms-card-body">
      <div className="ms-label">{label}</div>
      <div className="ms-stat-value">{value}</div>
      {sub && <div className="ms-section-subtitle">{sub}</div>}
    </article>
  );
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
        <Card label="หุ้นใน Portfolio" value={String(h.length)} />
        <Card
          label="มูลค่า TH"
          value={displayMoney(th?.current_value ?? 0, "THB", display, fx)}
          sub={
            th
              ? `ต้นทุน ${displayMoney(th.cost_basis, "THB", display, fx)} · P/L ${displayMoney(th.pnl, "THB", display, fx)} (${pct(thPct)}) · รับรู้ ${displayMoney(th.realized_pnl ?? 0, "THB", display, fx)} · ยังไม่รับรู้ ${displayMoney(th.unrealized_pnl ?? 0, "THB", display, fx)}`
              : "—"
          }
        />
        <Card
          label="มูลค่า US"
          value={displayMoney(us?.current_value ?? 0, "USD", display, fx)}
          sub={
            us
              ? `ต้นทุน ${displayMoney(us.cost_basis, "USD", display, fx)} · P/L ${displayMoney(us.pnl, "USD", display, fx)} (${pct(usPct)}) · รับรู้ ${displayMoney(us.realized_pnl ?? 0, "USD", display, fx)} · ยังไม่รับรู้ ${displayMoney(us.unrealized_pnl ?? 0, "USD", display, fx)}`
              : "—"
          }
        />
        <Card label="Alerts" value={String(a.length)} sub="ประวัติทั้งหมด" />
      </section>
      <section className="ms-card ms-dashboard-gap ms-dashboard-portfolio">
        <div className="ms-card-header">
          <div>
            <h2 className="ms-section-title">Portfolio</h2>
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
            <h2 className="ms-section-title">Watchlist</h2>
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
        <td>{x.quantity}</td>
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
      <table className="ms-table">
        <thead>
          <tr>
            <th>ตลาด (Market)</th>
            <th>หุ้น (Symbol)</th>
            <th>จำนวน (Qty)</th>
            <th>ต้นทุนเฉลี่ย (Avg Cost)</th>
            <th>ราคาปัจจุบัน (Price)</th>
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
  return (
    <div className="ms-table-wrap">
      <table className="ms-table">
        <thead>
          <tr>
            <th>หุ้น</th>
            <th>ราคาปัจจุบัน</th>
            <th>เปลี่ยนแปลง</th>
            <th>แจ้งเตือน</th>
            {editable && <th>⋯</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => {
            const q = quotes?.find(
              (z) => z.market === x.market && z.symbol === x.symbol,
            );
            const rules = [
              x.upper_percent != null ? "↑ " + pct(x.upper_percent) : null,
              x.lower_percent != null ? "↓ " + pct(x.lower_percent) : null,
              x.upper_price != null ? "↑ " + x.upper_price : null,
              x.lower_price != null ? "↓ " + x.lower_price : null,
            ].filter(Boolean);
            return (
              <tr key={x.id}>
                <td>
                  <strong>{x.symbol}</strong>
                  <small className="ms-table-sub">{x.market}</small>
                </td>
                <td>
                  {q ? money(Number(q.price), q.currency) : "—"}
                  {q && (
                    <small className="ms-table-sub">{freshnessLabel(q)}</small>
                  )}
                </td>
                <td
                  className={
                    Number(q?.change_percent || 0) >= 0
                      ? "ms-positive"
                      : "ms-negative"
                  }
                >
                  {q ? pct(q.change_percent) : "—"}
                </td>
                <td>
                  <span className="ms-watch-rules">
                    {rules.length ? rules.join(" / ") : "—"}
                  </span>
                </td>
                {editable && (
                  <td>
                    <div className="ms-row-menu">
                      <button
                        className="ms-menu-button"
                        onClick={() => onEdit?.(x)}
                      >
                        ⋯
                      </button>
                      <div className="ms-row-menu-popover">
                        <button onClick={() => onEdit?.(x)}>แก้ไข</button>
                        <button
                          className="danger"
                          onClick={() => onDelete?.(x.id)}
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
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
}: {
  market: string;
  value: string;
  onChange: (stock: StockSearch) => void;
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
        const r = await fetch(
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
        <span>⌕</span>
        <input
          aria-label="ค้นหาหุ้น"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value.toUpperCase());
            setOpen(true);
          }}
          placeholder="ค้นหาชื่อหุ้นหรือ Symbol"
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
    quantity: "",
    average_cost: "",
    currency: "THB",
    enabled: true,
  };
  const [mode, setMode] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<Holding | null>(null);
  const [f, setF] = useState<any>(empty);
  const [tx, setTx] = useState<any>({
    side: "BUY",
    order_id: "",
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
    const r = await fetch(url, {
      method: mode === "edit" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        quantity: Number(f.quantity),
        average_cost: Number(f.average_cost),
      }),
    });
    if (!r.ok) return alert("บันทึก Portfolio ไม่สำเร็จ");
    reset();
    reload();
  }
  async function remove(id: string) {
    const r = await fetch(`${API}/api/v1/portfolio/${id}`, {
      method: "DELETE",
    });
    if (r.ok) {
      setSelected(null);
      reload();
    }
  }
  async function openTx(h: Holding) {
    setSelected(h);
    const r = await fetch(`${API}/api/v1/portfolio/${h.id}/transactions`);
    setTxs(r.ok ? await r.json() : []);
    setShowFees(false);
    setTx({
      ...tx,
      side: "BUY",
      quantity: "",
      execution_price: "",
      order_id: "",
      executed_at: "",
    });
  }
  async function saveTx() {
    if (!selected) return;
    const n = (v: any) => (v === "" || v == null ? 0 : Number(v));
    const body = {
      side: tx.side,
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
    if (!body.quantity || !body.execution_price)
      return alert("กรุณาระบุจำนวนและราคา");
    const r = await fetch(
      `${API}/api/v1/portfolio/${selected.id}/transactions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!r.ok) return alert("บันทึกรายการไม่สำเร็จ");
    const rr = await fetch(
      `${API}/api/v1/portfolio/${selected.id}/transactions`,
    );
    setTxs(rr.ok ? await rr.json() : []);
    reload();
  }
  const groups = [
    ["TH", "หุ้นไทย"],
    ["US", "หุ้นสหรัฐ"],
  ];
  const feeKeys = [
    "commission",
    "trading_fee",
    "clearing_fee",
    "regulatory_fee",
    "cat_fee",
    "sec_fee",
    "taf_fee",
    "vat",
  ];
  const fees = feeKeys.reduce((s, k) => s + (Number(tx[k]) || 0), 0);
  return (
    <section className="ms-portfolio-page">
      <div className="ms-card ms-portfolio-toolbar">
        <div className="ms-card-header">
          <div>
            <h2 className="ms-section-title">Portfolio</h2>
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
        <div className="ms-simple-form ms-portfolio-add-form">
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
          <label>
            จำนวนหุ้น
            <input
              type="number"
              value={f.quantity}
              onChange={(e) => setF({ ...f, quantity: e.target.value })}
            />
          </label>
          <label>
            ราคาซื้อเฉลี่ย
            <input
              type="number"
              value={f.average_cost}
              onChange={(e) => setF({ ...f, average_cost: e.target.value })}
            />
          </label>
          <div className="ms-actions">
            <button className="ms-button ms-button-light" onClick={reset}>
              ยกเลิก
            </button>
            <button className="ms-button" onClick={save}>
              {mode === "edit" ? "บันทึก" : "เพิ่มหุ้น"}
            </button>
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
              <table className="ms-table">
                <thead>
                  <tr>
                    <th>หุ้น</th>
                    <th>จำนวน</th>
                    <th>ราคา</th>
                    <th>มูลค่า</th>
                    <th>P/L</th>
                    <th>%</th>
                    <th>⋯</th>
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
                    const pnlPct = avg ? (price / avg - 1) * 100 : 0;
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
                            pnlPct >= 0 ? "ms-positive" : "ms-negative"
                          }
                        >
                          {pct(pnlPct)}
                        </td>
                        <td>
                          <div className="ms-row-menu">
                            <button
                              className="ms-menu-button"
                              onClick={() =>
                                setSelected(selected?.id === x.id ? null : x)
                              }
                            >
                              ⋯
                            </button>
                            {selected?.id === x.id && (
                              <div className="ms-row-menu-popover">
                                <button onClick={() => openTx(x)}>
                                  ดูรายละเอียด / รายการซื้อขาย
                                </button>
                                <button
                                  onClick={() => {
                                    setMode("edit");
                                    setF({
                                      ...x,
                                      quantity: String(x.quantity),
                                      average_cost: String(x.average_cost),
                                    });
                                    setSelected(null);
                                  }}
                                >
                                  แก้ไข
                                </button>
                                <button
                                  className="danger"
                                  onClick={() => setDeleteTarget(x.id)}
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
        <div className="ms-transaction-panel ms-stock-detail">
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
              <strong>{Number(selected.quantity).toLocaleString()}</strong>
            </div>
            <div>
              <span>ต้นทุนเฉลี่ย</span>
              <strong>
                {displayMoney(
                  Number(selected.average_cost),
                  selected.currency,
                  display,
                  fx,
                )}
              </strong>
              <small className="ms-table-sub">
                Native:{" "}
                {money(Number(selected.average_cost), selected.currency)}
              </small>
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
                  quantity: "",
                  execution_price: "",
                  order_id: "",
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
                className={tx.side === "BUY" ? "active buy" : ""}
                onClick={() => setTx({ ...tx, side: "BUY" })}
              >
                BUY
              </button>
              <button
                className={tx.side === "SELL" ? "active sell" : ""}
                onClick={() => setTx({ ...tx, side: "SELL" })}
              >
                SELL
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
              {tx.side === "BUY" ? "ราคาที่ซื้อ" : "ราคาที่ขาย"}
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
              Order ID <span className="ms-optional">(ถ้ามี)</span>
              <input
                value={tx.order_id}
                onChange={(e) => setTx({ ...tx, order_id: e.target.value })}
              />
            </label>
            <div className="ms-trade-calculated">
              <div>
                <span>มูลค่า{tx.side === "BUY" ? "ซื้อ" : "ขาย"}</span>
                <strong>
                  {money(
                    (Number(tx.quantity) || 0) *
                      (Number(tx.execution_price) || 0),
                    selected.currency,
                  )}
                </strong>
              </div>
              <div>
                <span>ค่าธรรมเนียม</span>
                <strong>{money(fees, selected.currency)}</strong>
              </div>
              <div>
                <span>ยอดสุทธิ</span>
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
                  ค่าธรรมเนียม / ภาษี{" "}
                  <span className="ms-optional">(ทั้งหมด Optional)</span>
                </div>
                <div className="ms-fee-grid">
                  {[
                    ["commission", "Commission"],
                    [
                      "trading_fee",
                      selected.market === "TH"
                        ? "SET Trading Fee"
                        : "Trading Fee",
                    ],
                    [
                      "clearing_fee",
                      selected.market === "TH"
                        ? "TSD Clearing Fee"
                        : "Clearing Fee",
                    ],
                    ["regulatory_fee", "Regulatory Fee"],
                    ["cat_fee", "CAT Fee"],
                    ["sec_fee", "SEC Fee"],
                    ["taf_fee", "TAF Fee"],
                    ["vat", "VAT / Tax"],
                    ["fx_rate", "FX Rate"],
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
                  ช่องทั้งหมดเป็น Optional · BUY = มูลค่า + ค่าธรรมเนียม · SELL
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
                    <span>{String(x.executed_at || "—").slice(0, 10)}</span>
                    <span>
                      {Number(x.quantity).toLocaleString()} ×{" "}
                      {Number(x.execution_price).toLocaleString()}
                    </span>
                    <span>
                      {money(Number(x.net_amount || 0), selected.currency)}
                    </span>
                  </div>
                ))}
              </div>
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
  const [edit, setEdit] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false),
    [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  async function save() {
    const body = {
      ...f,
      upper_percent: f.upper_percent === "" ? null : Number(f.upper_percent),
      lower_percent: f.lower_percent === "" ? null : Number(f.lower_percent),
      upper_price: f.upper_price === "" ? null : Number(f.upper_price),
      lower_price: f.lower_price === "" ? null : Number(f.lower_price),
    };
    const editing = Boolean(edit && edit !== "new");
    const r = await fetch(
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
    const r = await fetch(API + "/api/v1/watchlist/" + id, {
      method: "DELETE",
    });
    if (r.ok) reload();
  }
  return (
    <section className="ms-card">
      <div className="ms-card-header">
        <div>
          <h2 className="ms-section-title">Watchlist</h2>
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
      {showForm && (
        <div className="ms-add-panel">
          <Form>
            <StockPicker
              market={f.market}
              value={f.symbol}
              onChange={(x) =>
                setF({ ...f, symbol: x.symbol, market: x.market })
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
                    onChange={(e) =>
                      setF({ ...f, upper_percent: e.target.value })
                    }
                  />
                </label>
                <label>
                  ราคา <span className="ms-optional">(Upper)</span>
                  <input
                    type="number"
                    placeholder="เช่น 38.00"
                    value={f.upper_price}
                    onChange={(e) =>
                      setF({ ...f, upper_price: e.target.value })
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
                    onChange={(e) =>
                      setF({ ...f, lower_percent: e.target.value })
                    }
                  />
                </label>
                <label>
                  ราคา <span className="ms-optional">(Lower)</span>
                  <input
                    type="number"
                    placeholder="เช่น 32.00"
                    value={f.lower_price}
                    onChange={(e) =>
                      setF({ ...f, lower_price: e.target.value })
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
          <h2 className="ms-section-title">Alerts</h2>
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
          ส่งแล้ว{" "}
          <strong>{rows.filter((x) => x.status === "delivered").length}</strong>
        </span>
        <span>
          ต้องตรวจสอบ{" "}
          <strong>{rows.filter((x) => x.status === "failed").length}</strong>
        </span>
      </div>
      <div className="ms-table-wrap">
        <table className="ms-table">
          <thead>
            <tr>
              <th>เวลา</th>
              <th>หุ้น</th>
              <th>เงื่อนไข</th>
              <th>ราคา</th>
              <th>เปลี่ยนแปลง</th>
              <th>การส่ง</th>
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
                    {x.retry_count > 0 && (
                      <small className="ms-table-sub">
                        ลองส่ง {x.retry_count} ครั้ง
                      </small>
                    )}
                    {x.last_error && (
                      <small className="ms-alert-error">{x.last_error}</small>
                    )}
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
    const r = await fetch(`${API}/api/v1/settings/${k}`, {
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
      const r = await fetch(`${API}/api/v1/market/stocks/sync`, {
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
      const r = await fetch(`${API}/api/v1/fx/usd-thb/sync`, {
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
          <h3>🔔 การแจ้งเตือน</h3>
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
          <h3>💰 การแสดงผล</h3>
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
          <h3>⚙ ระบบข้อมูล</h3>
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
      </div>
    </section>
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
