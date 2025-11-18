// src/pages/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

// body 스타일 (이미 한 번만 들어가면 다시 안들어감 – Home/My와 공통)
(function injectInnerScrollStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById("inner-scroll-style")) return;
  const s = document.createElement("style");
  s.id = "inner-scroll-style";
  s.textContent = `
    body {
      margin: 0;
      background: #eef2f7;
      overflow: hidden;
    }
    .inner-scroll {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .inner-scroll::-webkit-scrollbar {
      display: none;
    }
  `;
  document.head.appendChild(s);
})();

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function apiPost(path, body) {
    const res = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: raw };
    }
    if (!res.ok) throw new Error(data.message || `POST ${path} ${res.status}`);
    return data;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!userId.trim() || !password) {
      setMsg("아이디와 비밀번호를 입력하세요.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const data = await apiPost("/api/auth/login", {
        userId: userId.trim(),
        password,
      });
      if (data?.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        const back = loc.state?.from?.pathname || "/home";
        nav(back, { replace: true });
      } else {
        setMsg("로그인 실패: 토큰 없음");
      }
    } catch (err) {
      setMsg(err.message || "로그인 실패");
    } finally {
      setBusy(false);
    }
  }

  const S = styles;

  return (
    <div style={S.stage}>
      <div style={S.card}>
        {/* 이 박스 전체를 세로 가운데 정렬 */}
        <form onSubmit={onSubmit} style={S.centerBox}>
          {/* 로고 영역 */}
          <div style={S.logoBox}>
            <div style={S.logoInner}>로고 및 앱 이름</div>
          </div>

          {/* 입력 영역 */}
          <div style={{ width: "100%", marginTop: 32 }}>
            <div style={S.label}>아이디</div>
            <input
              style={S.input}
              placeholder="seo@skuniv.ac.kr"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>

          <div style={{ width: "100%", marginTop: 16 }}>
            <div style={S.label}>비밀번호</div>
            <input
              style={S.input}
              placeholder="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {msg && <div style={S.error}>{msg}</div>}

          {/* 버튼들 */}
          <div style={{ width: "100%", marginTop: 24 }}>
            <button type="submit" style={S.primaryBtn} disabled={busy}>
              {busy ? "로그인 중..." : "로그인"}
            </button>

            <button
              type="button"
              style={S.linkBtn}
              onClick={() => nav("/signup")}
            >
              회원가입
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  stage: {
    minHeight: "100vh",
    background: "#f1f5f9",
    display: "flex",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    height: "100vh",
    maxHeight: 720,
    background: "#ffffff",
    boxSizing: "border-box",
    padding: "0 24px 24px",
    display: "flex",
    // 카드 자체는 그냥 컨테이너 역할
  },
  // 가운데 정렬 박스
  centerBox: {
    margin: "auto",              // ← 세로/가로 모두 가운데
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  },
  logoBox: {
    display: "flex",
    justifyContent: "center",
    width: "100%",
  },
  logoInner: {
    width: 210,
    height: 180,
    background: "#e5e5e5",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    color: "#111827",
  },
  label: {
    fontSize: 13,
    color: "#111827",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: "11px 12px",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
    background: "#ffffff",
  },
  error: {
    width: "100%",
    marginTop: 10,
    fontSize: 13,
    color: "#dc2626",
  },
  primaryBtn: {
    width: "100%",
    border: 0,
    borderRadius: 12,
    padding: "13px 12px",
    background: "#2563ff",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    boxSizing: "border-box",
  },
  linkBtn: {
    marginTop: 10,
    width: "100%",
    border: 0,
    background: "transparent",
    color: "#2563ff",
    fontSize: 14,
    cursor: "pointer",
  },
};
