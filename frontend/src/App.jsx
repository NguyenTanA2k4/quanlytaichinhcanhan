import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// ── Helpers ────────────────────────────────────────────────
function formatVND(amount) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

// ── Components ─────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div className="stat-card" style={{ borderTop: `4px solid ${color}` }}>
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={{ color }}>{value}</span>
    </div>
  );
}

function TransactionRow({ tx }) {
  const isIncome = tx.type === "income";
  return (
    <tr>
      <td>{new Date(tx.created_at).toLocaleDateString("vi-VN")}</td>
      <td style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {tx.category}
        {tx.ai_classified && (
          <span className="badge ai" title={`Tin cậy: ${tx.ai_confidence}%`}>✨ AI</span>
        )}
      </td>
      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {tx.description || "—"}
      </td>
      <td className={isIncome ? "income" : "expense"}>
        {isIncome ? "+" : "-"}{formatVND(Math.abs(tx.amount))}
      </td>
      <td><span className={`badge ${tx.type}`}>{isIncome ? "Thu nhập" : "Chi tiêu"}</span></td>
    </tr>
  );
}

// ── Main App ───────────────────────────────────────────────
export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [form, setForm] = useState({
    amount: "", type: "expense", category: "Ăn uống", description: "",
  });

  // Demo: hardcoded token (trong thực tế lấy từ auth flow)
  const token = localStorage.getItem("token") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJpYXQiOjE3NzM5MzUwMjAsImV4cCI6MTgwNTQ3MTAyMH0.GRNRBXhBHpMlh6eUk7oJuxy-vw5qWPhCMXHt52VWdf4";

  const totalIncome  = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance      = totalIncome - totalExpense;

  async function fetchTransactions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/transactions?limit=50`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Bypass-Tunnel-Reminder": "true",
          "ngrok-skip-browser-warning": "true"
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTransactions(data.data || []);
    } catch (e) {
      setError("Không thể tải giao dịch: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/transactions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}`,
          "Bypass-Tunnel-Reminder": "true",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setForm({ amount: "", type: "expense", category: "Ăn uống", description: "" });
      fetchTransactions();
    } catch (e) {
      setError("Lỗi khi tạo giao dịch: " + e.message);
    }
  }

  useEffect(() => { fetchTransactions(); }, []);

  const categories = ["Ăn uống", "Hóa đơn", "Di chuyển", "Mua sắm", "Sức khỏe", "Giải trí", "Giáo dục", "Thu nhập", "Khác"];

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <h1>💸 Finance Assistant</h1>
          <p>Quản lý tài chính thông minh với AI</p>
        </div>
      </header>

      <main className="main">
        {/* Stats */}
        <div className="stats-grid">
          <StatCard label="Tổng thu nhập" value={formatVND(totalIncome)}  color="#22c55e" />
          <StatCard label="Tổng chi tiêu" value={formatVND(totalExpense)} color="#ef4444" />
          <StatCard label="Số dư"          value={formatVND(balance)}      color={balance >= 0 ? "#3b82f6" : "#f97316"} />
          <StatCard label="Giao dịch"      value={transactions.length}    color="#8b5cf6" />
        </div>

        <div className="grid-2col">
          {/* Form thêm giao dịch */}
          <section className="card">
            <h2>➕ Thêm giao dịch mới</h2>
            <form onSubmit={handleSubmit} className="form">
              <label>Số tiền (VNĐ)
                <input type="number" min="1" required placeholder="VD: 150000"
                  value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </label>
              <label>Loại
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="expense">Chi tiêu</option>
                  <option value="income">Thu nhập</option>
                </select>
              </label>
              <label>Danh mục
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label>Mô tả (AI sẽ phân loại tự động)
                <input type="text" placeholder="VD: Bữa trưa phở bò"
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </label>
              <button type="submit" className="btn-primary">Thêm giao dịch</button>
            </form>
          </section>

          {/* Kiến trúc hệ thống */}
          <section className="card">
            <h2>🏗️ Kiến trúc Microservices</h2>
            <div className="arch-diagram">
              <div className="arch-box frontend">🖥️ Frontend<br/><small>React + Vite</small></div>
              <div className="arch-arrow">↓ HTTP</div>
              <div className="arch-box gateway">🔀 API Gateway<br/><small>:8080 · Rate Limit · CORS</small></div>
              <div className="arch-row">
                <div>
                  <div className="arch-arrow">↓ JWT</div>
                  <div className="arch-box tx">💳 Transaction Service<br/><small>:8001 · PostgreSQL</small></div>
                </div>
                <div>
                  <div className="arch-arrow">↓ MQ</div>
                  <div className="arch-box ai">🤖 AI Service<br/><small>:8002 · TF-IDF + NB</small></div>
                </div>
              </div>
              <div className="arch-row">
                <div className="arch-box db">🐘 PostgreSQL</div>
                <div className="arch-box mq">🐰 RabbitMQ</div>
              </div>
            </div>
          </section>
        </div>

        {/* Lỗi */}
        {error && <div className="error-banner">⚠️ {error}</div>}

        {/* Danh sách giao dịch */}
        <section className="card">
          <div className="table-header">
            <h2>📋 Lịch sử giao dịch</h2>
            <button className="btn-secondary" onClick={fetchTransactions} disabled={loading}>
              {loading ? "Đang tải..." : "🔄 Làm mới"}
            </button>
          </div>
          {transactions.length === 0 ? (
            <div className="empty-state">
              {loading ? "⏳ Đang tải dữ liệu..." : "Chưa có giao dịch nào. Hãy thêm giao dịch đầu tiên!"}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Ngày</th><th>Danh mục</th><th>Mô tả</th><th>Số tiền</th><th>Loại</th></tr>
                </thead>
                <tbody>
                  {transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>Finance Assistant · Đồ án Kiến trúc hướng dịch vụ & Điện toán đám mây</p>
      </footer>
    </div>
  );
}
