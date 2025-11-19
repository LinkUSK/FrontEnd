// src/pages/ProfileEdit.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/mypage/profileEdit.css";
import BottomNav from "../components/BottomNav";

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function apiGet(path) {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }
  if (!res.ok)
    throw new Error(data.message || `GET ${path} failed (${res.status})`);
  return data;
}

async function apiPatch(path, body) {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    method: "PATCH",
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
  if (!res.ok)
    throw new Error(data.message || `PATCH ${path} failed (${res.status})`);
  return data;
}

async function uploadFile(file) {
  const token = getToken();
  const fd = new FormData();
  fd.append("file", file);
  const endpoint = "/api/files/upload"; // 로그인 상태니까 보호 업로드 사용
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
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data; // { url }
}

function pickAvatarCandidate(me) {
  if (!me) return {};
  const url =
    me.profileImageUrl ||
    me.avatarUrl ||
    me.photoUrl ||
    me.imageUrl ||
    me.avatar ||
    "";
  const base64 = me.avatarBase64 || me.avatar_b64 || "";
  const fileId = me.avatarFileId || me.fileId || "";
  const path = me.avatarPath || me.imagePath || "";
  return { url, base64, fileId, path };
}

export default function ProfileEdit() {
  const nav = useNavigate();
  const loc = useLocation();

  const [me, setMe] = useState(null);
  const [username, setUsername] = useState("");
  const [major, setMajor] = useState("");
  const [banner, setBanner] = useState({
    type: "info",
    text: "내 프로필 정보를 수정할 수 있습니다.",
  });
  const [busy, setBusy] = useState(false);

  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const fileInputRef = useRef(null);

  const meAvatarCandidate = useMemo(() => pickAvatarCandidate(me), [me]);

  // me 정보 불러오기
  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet("/api/me");
        setMe(data);
        setUsername(data?.username || "");
        setMajor(data?.major || "");
      } catch (e) {
        setBanner({
          type: "error",
          text: e.message || "프로필을 불러오지 못했습니다.",
        });
        if (String(e).includes("401")) nav("/login");
      }
    })();
  }, [nav]);

  // 기존 프로필 사진을 프리뷰로 세팅
  useEffect(() => {
    if (!meAvatarCandidate) return;
    const { url, base64, fileId, path } = meAvatarCandidate;
    if (base64) {
      setPhotoPreview(`data:image/*;base64,${base64}`);
      return;
    }
    if (url) {
      setPhotoPreview(url.startsWith("http") ? url : `${API_BASE}${url}`);
      return;
    }
    if (fileId) {
      setPhotoPreview(`${API_BASE}/api/files/${encodeURIComponent(fileId)}`);
      return;
    }
    if (path) {
      setPhotoPreview(
        `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`
      );
      return;
    }
    setPhotoPreview("");
  }, [meAvatarCandidate]);

  function showOk(msg) {
    setBanner({ type: "ok", text: msg });
    setTimeout(
      () =>
        setBanner({
          type: "info",
          text: "내 프로필 정보를 수정할 수 있습니다.",
        }),
      2500
    );
  }

  function showErr(msg) {
    setBanner({ type: "error", text: msg });
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
    const name = (username || "").trim();
    const mj = (major || "").trim();

    if (name.length < 2 || name.length > 30) {
      showErr("이름은 2~30자로 입력해주세요.");
      return;
    }

    setBusy(true);
    try {
      // 이미지 새로 업로드 시
      let profileImageUrl = me?.profileImageUrl || "";
      if (photoFile) {
        const up = await uploadFile(photoFile);
        profileImageUrl = up.url;
      }

      const body = {
        username: name,
        major: mj || undefined,
        profileImageUrl: profileImageUrl || undefined,
      };

      await apiPatch("/api/me", body);
      showOk("프로필을 저장했습니다.");
      // 저장 후 마이페이지로 이동
      setTimeout(() => nav("/my"), 600);
    } catch (e) {
      showErr(e.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const bannerClass =
    banner.type === "ok"
      ? "profileedit-banner profileedit-banner-ok"
      : banner.type === "error"
      ? "profileedit-banner profileedit-banner-error"
      : "profileedit-banner";

  return (
    <div className="profileedit-frame">
      <div className="profileedit-card">
        {/* 헤더 */}
        <div className="profileedit-header-row">
          <button
            type="button"
            className="profileedit-back-btn"
            onClick={() => nav(-1)}
          >
            ←
          </button>
          <div className="profileedit-title">프로필 수정</div>
        </div>

        {/* 배너 */}
        <div className={bannerClass}>{banner.text}</div>

        {/* 내용 */}
        <form onSubmit={handleSubmit} className="profileedit-form">
          <div className="inner-scroll profileedit-scroll-area">
            <label className="profileedit-label">
              이름 <span className="profileedit-required">*</span>
            </label>
            <input
              className="profileedit-input"
              placeholder="실명 입력"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
            />

            <label className="profileedit-label">
              전공 <span className="profileedit-required">*</span>
            </label>
            <input
              className="profileedit-input"
              placeholder="전공 입력"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
            />

            <div className="profileedit-photo-section">
              <div className="profileedit-label">프로필 사진</div>
              <div className="profileedit-photo-row">
                <div className="profileedit-photo-wrap">
                  {photoPreview ? (
                    <img
                      alt="preview"
                      src={photoPreview}
                      className="profileedit-photo-img"
                      onError={() => setPhotoPreview("")}
                    />
                  ) : (
                    <div className="profileedit-photo-placeholder">📷</div>
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
                  className="profileedit-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  ⬆ 업로드
                </button>
              </div>
            </div>
          </div>

          {/* 하단 고정 저장 버튼 */}
          <button
            type="submit"
            className="profileedit-primary-btn"
            disabled={busy}
          >
            {busy ? "저장 중…" : "저장"}
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
}