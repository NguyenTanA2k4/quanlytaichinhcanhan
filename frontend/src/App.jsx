import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CSVLink } from "react-csv";

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

// ── Auth Screen ────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) throw new Error(data.errors.map(e => e.msg).join(", "));
        throw new Error(data.error || "Lỗi xác thực");
      }

      // Xử lý luồng riêng cho Đăng Ký
      if (!isLogin) {
        alert("🎉 Đăng ký thành công! Vui lòng sử dụng tài khoản vừa tạo để đăng nhập.");
        setIsLogin(true); // Chuyển từ tab Đăng Ký sang Đăng Nhập
        setPassword("");  // Xóa trắng mật khẩu
        return;
      }

      // Luồng Đăng Nhập
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
      <div className="card" style={{ width: '400px', padding: '30px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>{isLogin ? "Đăng Nhập" : "Tạo Tài Khoản"}</h2>
        {error && <div className="error-banner" style={{ marginBottom: '15px' }}>⚠️ {error}</div>}
        <form onSubmit={handleSubmit} className="form">
          <label>Tên đăng nhập
            <input type="text" required minLength="3" autoFocus
                   value={username} onChange={e => setUsername(e.target.value)} />
          </label>
          <label>Mật khẩu
            <input type="password" required minLength="6"
                   value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? "Đang tải..." : (isLogin ? "Đăng nhập" : "Đăng ký")}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9em' }}>
          {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
          <button onClick={() => { setIsLogin(!isLogin); setError(null); }} 
                  style={{ background: 'none', border: 'none', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', marginLeft: '5px' }}>
            {isLogin ? "Đăng ký ngay" : "Đăng nhập lại"}
          </button>
        </div>
      </div>
    </div>
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
  
  const [ocrLoading, setOcrLoading] = useState(false);
  
  // Trạng thái Auth
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));

  // Đăng xuất
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setCurrentUser(null);
  }

  useEffect(() => {
    if (token) {
      fetchTransactions();
    }
  }, [token]);

  const totalIncome  = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance      = totalIncome - totalExpense;

  // ── Tính toán dữ liệu Biểu Đồ (Charts) ──
  // 1. Pie Chart: Phân bổ Chi tiêu theo Danh mục
  const expenses = transactions.filter(t => t.type === "expense");
  const categoryDataRaw = expenses.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + Number(tx.amount);
    return acc;
  }, {});
  const pieData = Object.keys(categoryDataRaw).map(key => ({
    name: key, 
    value: categoryDataRaw[key]
  }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6'];

  // 2. Bar Chart: Thu Thu / Chi theo từng ngày (Tối đa 7 ngày gần nhất)
  const groupedByDate = transactions.reduce((acc, tx) => {
    const date = new Date(tx.created_at).toLocaleDateString("vi-VN").substring(0, 5); // DD/MM
    if (!acc[date]) acc[date] = { date, income: 0, expense: 0 };
    if (tx.type === 'income') acc[date].income += Number(tx.amount);
    else acc[date].expense += Number(tx.amount);
    return acc;
  }, {});
  const barData = Object.values(groupedByDate).slice(0, 7).reverse();

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

  async function handleOCRUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    setOcrLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/ai/ocr`, {
        method: "POST",
        headers: { 
          // Do not set Content-Type, trình duyệt sẽ tự gán boundary cho FormData
          "Bypass-Tunnel-Reminder": "true",
          "ngrok-skip-browser-warning": "true",
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} OCR failed. Kiểm tra AI Service`);
      const data = await res.json();
      
      if (data.amount > 0) {
        setForm({
          amount: data.amount,
          type: data.type || "expense",
          category: data.category && categories.includes(data.category) ? data.category : form.category,
          description: data.description || "Từ hóa đơn OCR",
        });
        alert(`🤖 Gemini AI đã đọc thành công!\n💰 Số tiền: ${formatVND(data.amount)}\n📂 Danh mục: ${data.category || "Khác"}\n📝 Mô tả: ${data.description || "Từ hóa đơn OCR"}`);
      } else {
        alert(`📸 AI đã quét xong nhưng không tìm thấy số tiền rõ ràng. Bạn chịu khó nhập tay nhé!`);
      }
      
    } catch (err) {
      setError("Lỗi Quét Hóa Đơn: " + err.message);
    } finally {
      setOcrLoading(false);
      // Reset file input để có thể chọn lại ảnh cũ
      e.target.value = "";
    }
  }

  // Nếu chưa có token, chặn không cho render nội dung App (Auth Guard)
  if (!token) {
    return <AuthScreen onLogin={(newToken, user) => {
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(user));
      setToken(newToken);
      setCurrentUser(user);
    }} />
  }

  const categories = ["Ăn uống", "Hóa đơn", "Di chuyển", "Mua sắm", "Sức khỏe", "Giải trí", "Giáo dục", "Thu nhập", "Khác"];

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>💸 Finance Assistant</h1>
            <p>Quản lý tài chính thông minh với AI</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>👤 {currentUser?.username}</p>
            <button onClick={handleLogout} className="btn-secondary" style={{ marginTop: '5px', fontSize: '12px', padding: '4px 8px' }}>
              🚪 Đăng xuất
            </button>
          </div>
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

        {/* Biểu đồ thống kê (Hiển thị nếu có giao dịch) */}
        {transactions.length > 0 && (
          <div className="grid-2col" style={{ marginBottom: '20px' }}>
            {/* Pie Chart */}
            <section className="card">
              <h2>🍕 Chi tiêu theo danh mục</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatVND(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Bar Chart */}
            <section className="card">
              <h2>📊 Lịch sử Thu / Chi</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis tickFormatter={(val) => (val/1000) + 'k'} stroke="#6b7280" />
                    <Tooltip formatter={(value) => formatVND(value)} cursor={{fill: '#f3f4f6'}} />
                    <Legend />
                    <Bar dataKey="income" name="Thu nhập" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Chi tiêu" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        )}

        <div className="grid-2col">
          {/* Form thêm giao dịch & OCR */}
          <section className="card">
            <h2>➕ Nhập bằng tay</h2>
            
            {/* Box Upload Hóa Đơn */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#166534' }}>🤖 Quét Hóa Đơn Tự Động (Gemini AI Vision)</h3>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#15803d' }}>
                Tải ảnh hóa đơn lên, AI <b>Gemini</b> sẽ tự đọc số tiền, loại và danh mục.
              </p>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleOCRUpload} 
                disabled={ocrLoading}
              />
              {ocrLoading && <div style={{ marginTop: '10px', color: '#047857', fontWeight: 'bold' }}>🤖 Đang mổ xẻ ảnh... Vui lòng đợi 3-10s...</div>}
            </div>

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
          <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>📋 Lịch sử giao dịch</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-secondary" onClick={fetchTransactions} disabled={loading}>
                {loading ? "Đang tải..." : "🔄 Làm mới"}
              </button>
              {transactions.length > 0 && (
                <CSVLink 
                  data={transactions.map(tx => ({
                    Ngày: new Date(tx.created_at).toLocaleString('vi-VN'),
                    'Loại': tx.type === 'income' ? 'Thu Nhập' : 'Chi Tiêu',
                    'Danh mục': tx.category,
                    'Mô tả': tx.description,
                    'Số tiền (VNĐ)': tx.amount,
                    'Phân loại bởi AI': tx.ai_classified ? 'Có' : 'Không'
                  }))}
                  filename={`bao-cao-tai-chinh-${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.csv`}
                  className="btn-primary"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  📥 Xuất Excel (.csv)
                </CSVLink>
              )}
            </div>
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
