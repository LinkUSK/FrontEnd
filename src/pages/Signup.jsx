// src/pages/Signup.jsx
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/signUp.css"; 
import backIcon from '/images/back-icon.png'
import upLoadIcon from '/images/upload-icon.png'
import profileIcon from '/images/profile-default-icon.png'
import mailIcon from '/images/mail-icon.png'

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

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
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }
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
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data; // { url }
}

export default function Signup() {
  const nav = useNavigate();

  const [grade, setGrade] = useState("");
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
  function showErr(msg) {
    setBanner({ type: "error", text: msg });
  }

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

  const bannerClass =
    "signup-banner " +
    (banner.type === "ok"
      ? "signup-banner--ok"
      : banner.type === "error"
      ? "signup-banner--error"
      : "");

  // 완료 화면
  if (completed) {
    return (
      <div className="signup-stage">
        <div className="signup-card">
          <div className="signup-headerRow">
            <button
              onClick={() => setCompleted(false)}
              className="signup-backBtn"
            >
              ←
            </button>
            <div className="signup-title">회원가입</div>
          </div>

          <div className="signup-completedBody">
            <div className="signup-completedIcon">✔️</div>
            <div className="signup-completedText">
              {(username || "").trim() || "회원"}님의
              <br />
              회원가입이 완료되었습니다.
            </div>
          </div>

          <button
            className="signup-primaryBtn"
            onClick={() => nav("/login")}
          >
            로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-stage">
      <div className="signup-card">
        {/* 헤더 */}
        <div className="signup-headerRow">
          <img onClick={() => nav(-1)} src={backIcon} alt="Back" className="signup-backBtn" />
          <div className="signup-title">회원가입</div>
        </div>

        {/* 배너 */}
        <div className={bannerClass}>{banner.text}</div>

        {/* 내용 + 아래 고정 버튼 */}
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="inner-scroll signup-scrollArea">
            <label className="signup-label">
              학교 이메일 <span className="signup-required">*</span>
            </label>
            <div className="signup-inputRow">
              <input
                className="signup-input signup-input-emailLocal"
                placeholder="이메일 입력"
                value={emailLocal}
                onChange={(e) =>
                  setEmailLocal(e.target.value.replace(/\s/g, ""))
                }
                disabled={verified}
              />
              <div className="signup-emailDomain">{emailDomain}</div>
            </div>

            <div className="signup-emailActionsRow">
              <div className="signup-emailBtn">
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={!canSend}
                  className="signup-ghostBtn signup-sendCodeBtn"
                >
                  <img src={mailIcon} alt="Mail" className="signup-mailIcon" />
                  {sending ? "전송 중…" : "인증하기"}
                </button>
              </div>

              {sent && !verified && (
                <div className="signup-infoCard">
                  <div className="signup-infoCardText">
                    인증 메일이 발송되었습니다
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVerifyCard(true)}
                    className="signup-miniBtn"
                  >
                    인증 완료하기
                  </button>
                </div>
              )}

              {verified && (
                <div className="signup-badgeOk">✅ 이메일 인증 완료</div>
              )}
            </div>

            <label className="signup-label">
              비밀번호 <span className="signup-required">*</span>
            </label>
            <input
              type="password"
              className="signup-input"
              placeholder="8자 이상 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label className="signup-label">
              비밀번호 확인 <span className="signup-required">*</span>
            </label>
            <input
              type="password"
              className="signup-input"
              placeholder="비밀번호 재입력"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />

            <label className="signup-label">
              이름 <span className="signup-required">*</span>
            </label>
            <input
              className="signup-input"
              placeholder="실명 입력"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <label className="signup-label">
              전공 <span className="signup-required">*</span>
            </label>
            <input
              className="signup-input"
              placeholder="전공 입력"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
            />

            <label className="signup-label">
              학년 <span className="signup-required">*</span>
            </label>
            <select
              className="signup-input signup-select"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="">학년 선택</option>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
              <option value="4">4학년</option>
              <option value="5">5학년 이상</option>
            </select>

            <div className="signup-photoBlock">
              <div className="signup-label">프로필 사진</div>
              <div className="signup-photoSection">
                <div className="signup-photoWrap">
                  {photoPreview ? (
                    <img
                      alt="preview"
                      src={photoPreview}
                      className="signup-photoImg"
                    />
                  ) : (
                    <img src={profileIcon} className="signup-profile-icon" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="signup-photoInputHidden"
                  onChange={onPickFile}
                />
                <button
                  type="button"
                  className="signup-uploadBtn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <img src={upLoadIcon} alt="Upload" className="signup-uploadIcon" />
                  업로드
                </button>
              </div>
            </div>
          </div>

          {/* 하단 고정 "다음" 버튼 */}
          <button
            type="submit"
            className="signup-primaryBtn signup-nextBtn"
            disabled={busy}
          >
            {busy ? "처리 중…" : "다음"}
          </button>
        </form>
      </div>

      {/* 인증 코드 입력 모달 */}
      {showVerifyCard && (
        <div className="signup-overlay">
          <div className="signup-verifyCard">
            <div className="signup-verifyTitle">인증코드 입력</div>
            <div className="signup-verifyDesc">
              메일로 받은 6자리 코드를 입력하세요.
            </div>
            <input
              className="signup-input"
              placeholder="6자리"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
            <div className="signup-verifyActions">
              <button
                className="signup-ghostBtn"
                type="button"
                onClick={() => setShowVerifyCard(false)}
              >
                닫기
              </button>
              <button
                className="signup-primaryBtn signup-verifyBtn"
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