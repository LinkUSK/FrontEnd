// src/pages/ProfileEdit.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// body 스크롤 막고 .inner-scroll 에만 스크롤
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
  if (!res.ok) throw new Error(data.message || `GET ${path} failed (${res.status})`);
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
  if (!res.ok) throw new Error(data.message || `PATCH ${path} failed (${res.status})`);
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
        setBanner({ type: "error", text: e.message || "프로필을 불러오지 못했습니다." });
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
      setPhotoPreview(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`);
      return;
    }
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

  const S = styles;

  // 하단 탭바
  function BottomBar() {
    const path = loc.pathname;
    const is = (p) =>
      p === "/home" ? path === "/home" : path.startsWith(p);

    return (
      <div style={S.bottomWrap}>
        <div style={S.bottomInner}>
          <div style={S.tab(is("/home"))} onClick={() => nav("/home")}>
            <div style={{ fontSize: 20 }}>🏠</div>
            <div>홈</div>
          </div>
          <div style={S.tab(is("/create"))} onClick={() => nav("/create")}>
            <div style={{ fontSize: 20 }}>✏️</div>
            <div>재능 등록</div>
          </div>
          <div style={S.tab(is("/chat"))} onClick={() => nav("/chat")}>
            <div style={{ fontSize: 20 }}>💬</div>
            <div>채팅</div>
          </div>
          <div style={S.tab(is("/my"))} onClick={() => nav("/my")}>
            <div style={{ fontSize: 20 }}>👤</div>
            <div>마이페이지</div>
          </div>
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
          <div style={S.title}>프로필 수정</div>
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

        {/* 내용 */}
        <form onSubmit={handleSubmit} style={S.form}>
          <div className="inner-scroll" style={S.scrollArea}>
            <label style={S.label}>
              이름 <span style={S.required}>*</span>
            </label>
            <input
              style={S.input}
              placeholder="실명 입력"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
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

            <div style={{ marginTop: 12 }}>
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
                      onError={() => setPhotoPreview("")}
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

          {/* 하단 고정 저장 버튼 */}
          <button
            type="submit"
            style={{ ...S.primaryBtn, marginTop: 10 }}
            disabled={busy}
          >
            {busy ? "저장 중…" : "저장"}
          </button>
        </form>
      </div>

      <BottomBar />
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
    background: "#ffffff",
    borderRadius: 0,
    boxShadow: "0 0 0 rgba(0,0,0,0)",
    boxSizing: "border-box",
    padding: "0 24px 80px", // 아래 버튼 + 탭바 여유
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
  photoWrap: {
    width: 72,
    height: 72,
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
  bottomWrap: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    background: "#fff",
    borderTop: "1px solid #e5e7eb",
  },
  bottomInner: { maxWidth: 420, margin: "0 auto", display: "flex" },
  tab: (active) => ({
    flex: 1,
    textAlign: "center",
    padding: "8px 0",
    borderTop: active ? "2px solid #4f46e5" : "2px solid transparent",
    color: active ? "#4f46e5" : "#94a3b8",
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    cursor: "pointer",
  }),
};
