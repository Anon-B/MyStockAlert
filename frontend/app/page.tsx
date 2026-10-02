export default function Home() {
  return (
    <main className="ms-main">
      <h1>MyStockAlert</h1>
      <p>Stock Portfolio & Alert System</p>
      <section className="ms-grid ms-grid-4" style={{ marginTop: 24 }}>
        <article className="ms-card ms-card-body">
          <div>Portfolio Value</div>
          <div className="ms-stat-value">฿0.00</div>
        </article>
        <article className="ms-card ms-card-body">
          <div>Total P/L</div>
          <div className="ms-stat-value ms-positive">0.00%</div>
        </article>
        <article className="ms-card ms-card-body">
          <div>Watchlist</div>
          <div className="ms-stat-value">0</div>
        </article>
        <article className="ms-card ms-card-body">
          <div>Alerts</div>
          <div className="ms-stat-value">0</div>
        </article>
      </section>
    </main>
  );
}
