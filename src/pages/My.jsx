// src/pages/My.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

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
  });
  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }
  if (!res.ok) throw new Error(data.message || `GET ${path} failed (${res.status})`);
  return data;
}

async function apiDelete(path) {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    method: "DELETE",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }
  if (!res.ok) throw new Error(data.message || `DELETE ${path} failed (${res.status})`);
  return data;
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

export default function My() {
  const nav = useNavigate();
  const loc = useLocation();

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // 별점 요약 상태
  const [ratingSummary, setRatingSummary] = useState({
    averageScore: null,
    reviewCount: null,
  });
  const [ratingError, setRatingError] = useState("");

  const styles = {
    frame: { background: "#eef2f7", minHeight: "100vh" },
    wrap: {
      maxWidth: 420,
      margin: "0 auto",
      height: "100vh",
      background: "#f8fafc",
      padding: "0 16px 0",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
    },
    top: {
      fontWeight: 800,
      fontSize: 22,
      padding: "18px 2px 10px",
      textAlign: "center",
      flexShrink: 0,
    },
    inner: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 90,
      boxSizing: "border-box",
    },
    profileBox: {
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: 18,
      marginTop: 6,
      marginBottom: 12,
    },
    avatarRow: { display: "flex", alignItems: "center", gap: 14 },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: "50%",
      background: "#e2e8f0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 24,
      overflow: "hidden",
    },
    avatarImg: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
    name: { fontWeight: 800, fontSize: 16, color: "#0f172a" },
    sub: { marginTop: 4, fontSize: 13, color: "#64748b" },
    starsRow: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginTop: 8,
      color: "#0f172a",
    },
    star: { color: "#f59e0b", fontSize: 16 },
    smallMuted: { fontSize: 12, color: "#94a3b8" },
    btnPrimary: {
      border: 0,
      borderRadius: 12,
      padding: "12px 14px",
      background: "#111827",
      color: "#fff",
      fontWeight: 700,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    btnDanger: {
      border: 0,
      borderRadius: 12,
      padding: "10px 12px",
      background: "#ef4444",
      color: "#fff",
      fontWeight: 800,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    msg: { minHeight: 20, marginTop: 10, fontSize: 13 },
    ok: { color: "#16a34a" },
    error: { color: "#dc2626" },

    menuList: {
      marginTop: 18,
    },
    menuItem: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 14px",
      marginBottom: 10,
      borderRadius: 14,
      border: "1px solid #e5e7eb",
      background: "#fff",
      cursor: "pointer",
      boxSizing: "border-box",
    },
    menuLeft: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 14,
      color: "#111827",
      fontWeight: 500,
    },
    menuIcon: {
      width: 22,
      textAlign: "center",
      fontSize: 16,
    },
    menuArrow: {
      fontSize: 16,
      color: "#cbd5f5",
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

  // me 불러오기
  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        nav("/login");
        return;
      }
      try {
        setLoading(true);
        const data = await apiGet("/api/me");
        setMe(data);
      } catch (e) {
        setMsg({
          type: "error",
          text: e.message || "프로필을 불러오지 못했어요.",
        });
        if (String(e).includes("401")) nav("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  const meAvatarCandidate = useMemo(() => pickAvatarCandidate(me), [me]);
  const [avatarSrc, setAvatarSrc] = useState("");

  useEffect(() => {
    const { url, base64, fileId, path } = meAvatarCandidate;
    if (base64) {
      setAvatarSrc(`data:image/*;base64,${base64}`);
      return;
    }
    if (url) {
      setAvatarSrc(url.startsWith("http") ? url : `${API_BASE}${url}`);
      return;
    }
    if (fileId) {
      setAvatarSrc(`${API_BASE}/api/files/${encodeURIComponent(fileId)}`);
      return;
    }
    if (path) {
      setAvatarSrc(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`);
      return;
    }
    setAvatarSrc("");
  }, [meAvatarCandidate]);

  // 별점 평균 / 후기 개수
  useEffect(() => {
    if (!me) return;
    (async () => {
      try {
        setRatingError("");
        const data = await apiGet("/api/chat/linku/rating/me");
        const avg =
          typeof data.averageScore === "number"
            ? data.averageScore
            : Number(data.averageScore) || 0;
        const cnt =
          typeof data.reviewCount === "number"
            ? data.reviewCount
            : Number(data.reviewCount) || 0;
        setRatingSummary({ averageScore: avg, reviewCount: cnt });
      } catch (e) {
        setRatingError(e.message || "별점 정보를 불러오지 못했어요.");
      }
    })();
  }, [me]);

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    nav("/login");
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "정말로 회원을 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      )
    )
      return;
    try {
      setMsg({ type: "", text: "" });
      await apiDelete("/api/me");
      setMsg({ type: "ok", text: "✅ 회원 탈퇴가 완료되었습니다." });
      localStorage.removeItem(TOKEN_KEY);
      setTimeout(() => nav("/login"), 700);
    } catch (e) {
      setMsg({ type: "error", text: `❌ ${e.message}` });
    }
  }

  function BottomBar() {
    const is = (p) =>
      p === "/home" ? loc.pathname === "/home" : loc.pathname.startsWith(p);
    return (
      <div style={styles.bottomWrap}>
        <div style={styles.bottomInner}>
          <div style={styles.tab(is("/home"))} onClick={() => nav("/home")}>
            <div style={{ fontSize: 20 }}>🏠</div>
            <div>홈</div>
          </div>
          <div
            style={styles.tab(is("/create"))}
            onClick={() => nav("/create")}
          >
            <div style={{ fontSize: 20 }}>✏️</div>
            <div>재능 등록</div>
          </div>
          <div style={styles.tab(is("/chat"))} onClick={() => nav("/chat")}>
            <div style={{ fontSize: 20 }}>💬</div>
            <div>채팅</div>
          </div>
          <div style={styles.tab(is("/my"))} onClick={() => nav("/my")}>
            <div style={{ fontSize: 20 }}>👤</div>
            <div>마이페이지</div>
          </div>
        </div>
      </div>
    );
  }

  const displayAvg =
    ratingSummary.averageScore != null
      ? ratingSummary.averageScore.toFixed(1)
      : "0.0";
  const displayCount =
    ratingSummary.reviewCount != null ? ratingSummary.reviewCount : 0;

  return (
    <div style={styles.frame}>
      <div style={styles.wrap}>
        <div style={styles.top}>마이페이지</div>

        <div className="inner-scroll" style={styles.inner}>
          <div style={styles.profileBox}>
            {/* 프로필 영역 */}
            <div style={styles.avatarRow}>
              <div style={styles.avatar} title="프로필 사진">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    style={styles.avatarImg}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarSrc("")}
                  />
                ) : (
                  "👤"
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={styles.name}>
                  {loading ? "불러오는 중…" : me?.username || "이름 없음"}
                </div>
                <div style={styles.sub}>{me?.major || "전공 미입력"}</div>
                <div style={styles.starsRow}>
                  <span style={styles.star}>★</span>
                  <span style={{ fontWeight: 700 }}>{displayAvg}</span>
                  <span style={styles.smallMuted}>후기 {displayCount}개</span>
                </div>
                {ratingError && (
                  <div
                    style={{
                      ...styles.smallMuted,
                      color: "#dc2626",
                      marginTop: 2,
                    }}
                  >
                    {ratingError}
                  </div>
                )}
              </div>

              {/* 로그아웃 + 회원 탈퇴 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <button onClick={logout} style={styles.btnPrimary}>
                  로그아웃
                </button>
                <button onClick={deleteAccount} style={styles.btnDanger}>
                  회원 탈퇴
                </button>
              </div>
            </div>

            {/* ✅ 프로필 수정 페이지로 이동 */}
            <button
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 999,
                padding: "10px 16px",
                background: "#f9fafb",
                marginTop: 16,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
                fontWeight: 700,
              }}
              onClick={() => nav("/my/edit")}
            >
              <span>📝</span>
              <span>프로필 수정</span>
            </button>

            <div
              style={{
                ...styles.msg,
                ...(msg.type === "ok"
                  ? styles.ok
                  : msg.type === "error"
                  ? styles.error
                  : {}),
              }}
            >
              {msg.text}
            </div>

            {/* 메뉴 리스트 */}
            <div style={styles.menuList}>
              <button
                type="button"
                style={styles.menuItem}
                onClick={() => nav("/my/reviews")}
              >
                <div style={styles.menuLeft}>
                  <span style={styles.menuIcon}>📝</span>
                  <span>받은 후기</span>
                </div>
                <span style={styles.menuArrow}>›</span>
              </button>

              <button
                type="button"
                style={styles.menuItem}
                onClick={() => nav("/my/posts")}
              >
                <div style={styles.menuLeft}>
                  <span style={styles.menuIcon}>📄</span>
                  <span>내 게시물</span>
                </div>
                <span style={styles.menuArrow}>›</span>
              </button>

              <button
                type="button"
                style={styles.menuItem}
                onClick={() => nav("/my/links")}
              >
                <div style={styles.menuLeft}>
                  <span style={styles.menuIcon}>👥</span>
                  <span>내 링크유</span>
                </div>
                <span style={styles.menuArrow}>›</span>
              </button>

              <button
                type="button"
                style={styles.menuItem}
                onClick={() => nav("/my/favorites")}
              >
                <div style={styles.menuLeft}>
                  <span style={styles.menuIcon}>⭐</span>
                  <span>즐겨찾기 목록</span>
                </div>
                <span style={styles.menuArrow}>›</span>
              </button>
            </div>
          </div>
        </div>

        <BottomBar />
      </div>
    </div>
  );
}
