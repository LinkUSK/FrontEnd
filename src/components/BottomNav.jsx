// src/components/BottomNav.jsx
import { NavLink } from "react-router-dom";

const base = { flex: 1, textAlign: "center", padding: "8px 0", textDecoration: "none", fontSize: 12 };
const active = { color: "#4f46e5", fontWeight: 700, borderTop: "2px solid #4f46e5" };
const normal = { color: "#94a3b8", fontWeight: 500, borderTop: "2px solid transparent" };

export default function BottomNav() {
  const bar = {
    position: "fixed", left: 0, right: 0, bottom: 0,
    borderTop: "1px solid #e5e7eb", background: "#fff", display: "flex", maxWidth: 420, margin: "0 auto"
  };

  return (
    <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: "1px solid #e5e7eb" }}>
      <div style={bar}>
        <NavLink to="/home"   style={({isActive}) => ({ ...base, ...(isActive ? active : normal) })}>🏠<div>홈</div></NavLink>
        <NavLink to="/create" style={({isActive}) => ({ ...base, ...(isActive ? active : normal) })}>✏️<div>등록</div></NavLink>
        <NavLink to="/chat"   style={({isActive}) => ({ ...base, ...(isActive ? active : normal) })}>💬<div>채팅</div></NavLink>
        <NavLink to="/my"     style={({isActive}) => ({ ...base, ...(isActive ? active : normal) })}>👤<div>마이</div></NavLink>
      </div>
    </nav>
  );
}
