// src/pages/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/login/login.css"; 
import linkuLogo from '/images/LinkU_Logo.png'
import linkuTitle from '/images/LinkU_Title.png'
import linkuSubTitle from '/images/LinkU_SubTitle.png'

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

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

  return (
    <div className="login-stage">
      <div className="login-card">
        <form onSubmit={onSubmit} className="login-centerBox">
          <div className="login-logoBox">
            <img src={linkuLogo} alt="LinkU Logo" className="login-logo" />
            <div className="login-title-box">
              <img src={linkuSubTitle} alt="LinkU Subtitle" className="login-subtitle" />
              <img src={linkuTitle} alt="LinkU Title" className="login-title" />
            </div>
          </div>

          {/* 아이디 */}
          <div className="login-section">
            <div className="login-label">아이디</div>
            <input
              className="login-input"
              placeholder="seo@skuniv.ac.kr"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>

          {/* 비밀번호 */}
          <div className="login-section">
            <div className="login-label">비밀번호</div>
            <input
              className="login-input"
              placeholder="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {msg && <div className="login-error">{msg}</div>}

          {/* 버튼 */}
          <div className="login-section">
            <button type="submit" className="login-primaryBtn" disabled={busy}>
              {busy ? "로그인 중..." : "로그인"}
            </button>

            <button
              type="button"
              className="login-linkBtn"
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