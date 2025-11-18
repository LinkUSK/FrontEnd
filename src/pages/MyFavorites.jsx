// src/pages/MyFavorites.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
/* ============ 공통 API 유틸 (Home / My 와 동일한 패턴) ============ */
function authHeaders() {
  const t = localStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiGet(path, params = {}) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.append(k, v);
    }
  });

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", ...authHeaders() },
    credentials: "include",
  });
  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }
  if (!res.ok) throw new Error(data.message || `GET ${path} ${res.status}`);
  return data;
}

// 절대 URL 변환
function toAbs(url) {
  if (!url) return "";
  return /^https?:\/\//i.test(url)
    ? url
    : `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

export default function MyFavorites() {
  const nav = useNavigate();
  const loc = useLocation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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
    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      padding: "14px 0 8px",
      flexShrink: 0,
    },
    backBtn: {
      position: "absolute",
      left: 0,
      top: "50%",
      transform: "translateY(-50%)",
      padding: "4px 6px",
      border: "none",
      background: "transparent",
      fontSize: 18,
      cursor: "pointer",
    },
    topTitle: {
      fontWeight: 800,
      fontSize: 18,
      textAlign: "center",
    },
    inner: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 90,
      boxSizing: "border-box",
    },

    // 카드
    card: {
      width: "100%",
      boxSizing: "border-box",
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: 14,
      cursor: "pointer",
      marginTop: 10,
    },
    topRow: {
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    avatarSmall: {
      width: 44,
      height: 44,
      borderRadius: "50%",
      background: "#e5e7eb",
      overflow: "hidden",
      flex: "0 0 44px",
    },
    avatarImgSmall: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
    nameLine: { fontSize: 13, color: "#0f172a" },
    title: {
      marginTop: 4,
      fontSize: 15,
      fontWeight: 700,
      color: "#0f172a",
    },
    chipRow: {
      display: "flex",
      gap: 6,
      marginTop: 8,
      flexWrap: "wrap",
    },
    chip: {
      fontSize: 11,
      padding: "6px 10px",
      border: "1px solid #e5e7eb",
      borderRadius: 999,
      background: "#fff",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
    },
    favIconWrap: {
      marginLeft: "auto",
      fontSize: 18,
      color: "#2563eb", // 파란색 별
    },
    smallMuted: { fontSize: 13, color: "#94a3b8", marginTop: 6 },

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

  // 즐겨찾기 목록 불러오기
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await apiGet("/api/talents/favorites", {
          page: 0,
          size: 50,
          sort: "id,desc",
        });
        const content = Array.isArray(data?.content) ? data.content : data;
        setItems(Array.isArray(content) ? content : []);
      } catch (e) {
        setErr(e.message || "즐겨찾기 목록을 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  function FavoriteCard({ item }) {
  const avatar = toAbs(item.authorProfileImageUrl);
  const name = item.authorName ?? item.authorUserId ?? "익명";
  const major = item.authorMajor || "전공 미입력";
  const tagNames = Array.isArray(item.tagNames)
    ? item.tagNames
    : item.tagName
    ? [item.tagName]
    : [];

  return (
    <div
      style={styles.card}
      onClick={() => nav(`/talent/${item.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") nav(`/talent/${item.id}`);
      }}
    >
      {/* 🔹 첫 줄: 프로필 + 이름/전공 + 즐겨찾기 아이콘 */}
      <div style={styles.topRow}>
        <div style={styles.avatarSmall}>
          {avatar ? (
            <img src={avatar} alt="avatar" style={styles.avatarImgSmall} />
          ) : null}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.nameLine}>
            <strong>{name}</strong> {` · ${major}`}
          </div>
        </div>
        <div style={styles.favIconWrap}>★</div>
      </div>

      {/* 🔹 두 번째 줄: 제목 (MyPosts랑 동일 위치) */}
      <div style={styles.title}>{item.title}</div>

      {/* 태그들 */}
      <div style={styles.chipRow}>
        {tagNames.map((t, idx) => (
          <span key={`${item.id}-${t}-${idx}`} style={styles.chip}>
            {t?.startsWith("#") ? t : `#${t}`}
          </span>
        ))}
      </div>
    </div>
  );
}

  return (
    <div style={styles.frame}>
      <div style={styles.wrap}>
        {/* 상단 바 */}
        <div style={styles.topBar}>
          <button
            type="button"
            style={styles.backBtn}
            onClick={() => nav(-1)} // 또는 nav("/my")
          >
            ←
          </button>
          <div style={styles.topTitle}>즐겨찾기 목록</div>
        </div>

        {/* 내용 영역 */}
        <div style={styles.inner} className="inner-scroll">
          {loading && <div style={styles.smallMuted}>불러오는 중…</div>}
          {err && <div style={{ ...styles.smallMuted, color: "#dc2626" }}>{err}</div>}
          {!loading && !err && items.length === 0 && (
            <div style={styles.smallMuted}>즐겨찾기한 재능글이 아직 없습니다.</div>
          )}
          {items.map((it) => (
            <FavoriteCard key={it.id} item={it} />
          ))}
        </div>

        <BottomBar />
      </div>
    </div>
  );
}
