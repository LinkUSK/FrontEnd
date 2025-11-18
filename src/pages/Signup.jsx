// src/pages/Signup.jsx
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

function getToken() { return localStorage.getItem(TOKEN_KEY); }

// body 스크롤 막고, .inner-scroll 안에서만 스크롤 (Login / Home / My 공통)
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

async function postJSON(path, body, token) {
  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

async function uploadFile(file) {
  const token = getToken();
  const fd = new FormData();
  fd.append("file", file);
  const endpoint = token ? "/api/files/upload" : "/api/files/upload-public";
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: fd,
  });
  const raw = await res.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data; // { url }
}

export default function Signup() {
  const nav = useNavigate();

  const [emailLocal, setEmailLocal] = useState("");
  const emailDomain = "@skuniv.ac.kr";
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [username, setUsername] = useState("");
  const [major, setMajor] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const fileInputRef = useRef(null);

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState({
    type: "info",
    text: "* 은 필수 입력란입니다",
  });
  const [showVerifyCard, setShowVerifyCard] = useState(false);
  const [completed, setCompleted] = useState(false);

  const fullEmail = (emailLocal || "").trim().toLowerCase() + emailDomain;
  const canSend = emailLocal.trim().length > 0 && !sending && !verified;
  const canVerify = code.trim().length === 6 && !verified;

  function showOk(msg) {
    setBanner({ type: "ok", text: msg });
    setTimeout(
      () => setBanner({ type: "info", text: "* 은 필수 입력란입니다" }),
      3000
    );
  }
  function showErr(msg) { setBanner({ type: "error", text: msg }); }

  async function handleSendCode() {
    if (!canSend) return;
    if (!fullEmail.endsWith(emailDomain)) {
      showErr("학교 이메일(@skuniv.ac.kr)만 가능합니다.");
      return;
    }
    setSending(true);
    try {
      await postJSON("/api/auth/request-code", { email: fullEmail });
      setSent(true);
      setShowVerifyCard(true);
    } catch (e) {
      showErr(e.message);
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    if (!canVerify) return;
    setVerified(true);
    setShowVerifyCard(false);
    showOk("이메일 인증 완료");
  }

  function onPickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      showErr("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      showErr("이미지 용량은 10MB 이하만 가능합니다.");
      return;
    }
    setPhotoFile(f);
    const r = new FileReader();
    r.onload = () => setPhotoPreview(r.result);
    r.readAsDataURL(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!verified) {
      showErr("이메일 인증을 먼저 완료해 주세요.");
      return;
    }
    if (!username.trim() || !password || !password2) {
      showErr("필수 입력을 확인해 주세요.");
      return;
    }
    if (password.length < 8) {
      showErr("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== password2) {
      showErr("비밀번호가 일치하지 않습니다.");
      return;
    }

    setBusy(true);
    try {
      let profileImageUrl = "";
      if (photoFile) {
        const up = await uploadFile(photoFile);
        profileImageUrl = up.url;
      }

      const res = await postJSON("/api/auth/verify-code", {
        email: fullEmail,
        code: code.trim(),
        username: username.trim(),
        password,
        major: major.trim() || undefined,
        profileImageUrl: profileImageUrl || undefined,
      });

      if (res?.token) localStorage.setItem(TOKEN_KEY, res.token);
      setCompleted(true);
    } catch (e) {
      showErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const S = styles;

  // 완료 화면
  if (completed) {
    return (
      <div style={S.stage}>
        <div style={S.card}>
          <div style={S.headerRow}>
            <button onClick={() => setCompleted(false)} style={S.backBtn}>
              ←
            </button>
            <div style={S.title}>회원가입</div>
          </div>

          <div style={S.completedBody}>
  <div style={{ fontSize: 44, marginBottom: 16 }}>✔️</div>
  <div
    style={{
      color: "#111827",
      fontSize: 16,
      textAlign: "center",
      lineHeight: 1.6,
    }}
  >
    {(username || "").trim() || "회원"}님의
    <br />
    회원가입이 완료되었습니다.
  </div>
</div>

          <button style={S.primaryBtn} onClick={() => nav("/login")}>
            로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.stage}>
      <div style={S.card}>
        {/* 헤더 */}
        <div style={S.headerRow}>
          <button onClick={() => nav(-1)} style={S.backBtn}>
            ←
          </button>
          <div style={S.title}>회원가입</div>
        </div>

        {/* 배너 */}
        <div
          style={{
            ...S.banner,
            ...(banner.type === "ok"
              ? {
                  background: "#ecfdf5",
                  borderColor: "#a7f3d0",
                  color: "#065f46",
                }
              : banner.type === "error"
              ? {
                  background: "#fef2f2",
                  borderColor: "#fecaca",
                  color: "#991b1b",
                }
              : {}),
          }}
        >
          {banner.text}
        </div>

        {/* 내용 + 아래 고정 버튼 */}
        <form onSubmit={handleSubmit} style={S.form}>
          <div className="inner-scroll" style={S.scrollArea}>
            <label style={S.label}>
              학교 이메일 <span style={S.required}>*</span>
            </label>
            <div style={S.inputRow}>
              <input
                style={{
                  ...S.input,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                }}
                placeholder="이메일 입력"
                value={emailLocal}
                onChange={(e) =>
                  setEmailLocal(e.target.value.replace(/\s/g, ""))
                }
                disabled={verified}
              />
              <div style={S.emailDomain}>{emailDomain}</div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={!canSend}
                style={{
                  ...S.ghostBtn,
                  flex: "0 0 130px",
                  opacity: canSend ? 1 : 0.6,
                }}
              >
                {sending ? "전송 중…" : "인증하기"}
              </button>

              {sent && !verified && (
                <div style={S.infoCard}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    인증 메일이 발송되었습니다
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVerifyCard(true)}
                    style={S.miniBtn}
                  >
                    인증 완료하기
                  </button>
                </div>
              )}

              {verified && <div style={S.badgeOk}>✅ 이메일 인증 완료</div>}
            </div>

            <label style={S.label}>
              비밀번호 <span style={S.required}>*</span>
            </label>
            <input
              type="password"
              style={S.input}
              placeholder="8자 이상 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label style={S.label}>
              비밀번호 확인 <span style={S.required}>*</span>
            </label>
            <input
              type="password"
              style={S.input}
              placeholder="비밀번호 재입력"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />

            <label style={S.label}>
              이름 <span style={S.required}>*</span>
            </label>
            <input
              style={S.input}
              placeholder="실명 입력"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <label style={S.label}>
              전공 <span style={S.required}>*</span>
            </label>
            <input
              style={S.input}
              placeholder="전공 입력"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
            />

            <div style={{ marginTop: 6 }}>
              <div style={S.label}>프로필 사진</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <div style={S.photoWrap}>
                  {photoPreview ? (
                    <img
                      alt="preview"
                      src={photoPreview}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "50%",
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 22, color: "#94a3b8" }}>📷</div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={onPickFile}
                />
                <button
                  type="button"
                  style={S.uploadBtn}
                  onClick={() => fileInputRef.current?.click()}
                >
                  ⬆ 업로드
                </button>
              </div>
            </div>
          </div>

          {/* 하단 고정 "다음" 버튼 */}
          <button
            type="submit"
            style={{ ...S.primaryBtn, marginTop: 10 }}
            disabled={busy}
          >
            {busy ? "처리 중…" : "다음"}
          </button>
        </form>
      </div>

      {/* 인증 코드 입력 모달 */}
      {showVerifyCard && (
        <div style={S.overlay}>
          <div style={S.verifyCard}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>인증코드 입력</div>
            <div
              style={{
                color: "#64748b",
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              메일로 받은 6자리 코드를 입력하세요.
            </div>
            <input
              style={S.input}
              placeholder="6자리"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                style={S.ghostBtn}
                type="button"
                onClick={() => setShowVerifyCard(false)}
              >
                닫기
              </button>
              <button
                style={{
                  ...S.primaryBtn,
                  flex: 1,
                  marginTop: 0,
                  opacity: canVerify ? 1 : 0.6,
                }}
                type="button"
                disabled={!canVerify}
                onClick={handleVerify}
              >
                인증 완료
              </button>
            </div>
          </div>
        </div>
      )}
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
    borderRadius: 0,
    boxShadow: "0 0 0 rgba(0,0,0,0)",
    boxSizing: "border-box",
    padding: "0 24px 24px",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    appearance: "none",
    border: 0,
    background: "transparent",
    fontSize: 18,
    cursor: "pointer",
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  title: { fontWeight: 800, fontSize: 18 },
  banner: {
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    color: "#0f172a",
    padding: "10px 12px",
    fontSize: 12,
    marginBottom: 8,
  },
  form: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  scrollArea: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    paddingBottom: 8,
    boxSizing: "border-box",
  },
  label: {
    fontSize: 12,
    color: "#374151",
    fontWeight: 600,
    marginTop: 4,
    marginBottom: 6,
  },
  required: { color: "#2563eb", fontWeight: 800, marginLeft: 2 },
  input: {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "12px 12px",
    outline: "none",
    background: "#fff",
    fontSize: 14,
    boxSizing: "border-box",
  },
  inputRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "stretch",
  },
  emailDomain: {
    border: "1px solid #e5e7eb",
    borderLeft: "none",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    padding: "12px 10px",
    fontSize: 12,
    color: "#111827",
    background: "#f8fafc",
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
  },
  ghostBtn: {
    border: "1px solid #e5e7eb",
    background: "#eef2ff",
    color: "#3730a3",
    padding: "11px 12px",
    borderRadius: 10,
    fontWeight: 800,
    cursor: "pointer",
    boxSizing: "border-box",
    fontSize: 13,
  },
  infoCard: {
    flex: 1,
    border: "1px solid #e5e7eb",
    background: "#f1f5ff",
    borderRadius: 12,
    padding: 8,
    display: "grid",
    gap: 6,
    alignContent: "center",
    justifyItems: "center",
    boxSizing: "border-box",
  },
  miniBtn: {
    border: 0,
    background: "#2563eb",
    color: "#fff",
    padding: "8px 10px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  badgeOk: {
    flex: 1,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    border: "1px solid #a7f3d0",
    background: "#ecfdf5",
    color: "#065f46",
    fontSize: 12,
    fontWeight: 700,
    boxSizing: "border-box",
  },
  photoWrap: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#f1f5f9",
    border: "1px solid #e5e7eb",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    boxSizing: "border-box",
  },
  uploadBtn: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    padding: "8px 12px",
    borderRadius: 10,
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 12,
  },
  primaryBtn: {
    width: "100%",
    background: "#2563ff",
    color: "#fff",
    border: 0,
    borderRadius: 12,
    padding: "14px 12px",
    fontWeight: 800,
    cursor: "pointer",
    marginTop: 8,
    boxSizing: "border-box",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,.35)",
    display: "grid",
    placeItems: "center",
    padding: 16,
  },
  verifyCard: {
    width: "100%",
    maxWidth: 360,
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    padding: 16,
    boxShadow: "0 18px 48px rgba(2,6,23,.18)",
    boxSizing: "border-box",
  },
  completedBody: {
    display: "grid",
    placeItems: "center",
    padding: "40px 10px 20px",
  },
};
