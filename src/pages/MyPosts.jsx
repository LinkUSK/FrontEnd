// src/pages/MyPosts.jsx
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
  if (!res.ok)
    throw new Error(data.message || `GET ${path} failed (${res.status})`);
  return data;
}
function toAbs(url) {
  if (!url) return "";
  return /^https?:\/\//i.test(url)
    ? url
    : `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

export default function MyPosts() {
  const nav = useNavigate();
  const loc = useLocation();

  const [me, setMe] = useState(null);
  const [list, setList] = useState([]);
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
    // 🔹 상단 뒤로가기 바
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
    sectionTitle: {
      fontWeight: 700,
      fontSize: 14,
      marginTop: 10,
      marginBottom: 8,
    },
    smallMuted: { fontSize: 12, color: "#94a3b8" },

    // 카드 (MyFavorites와 동일 size)
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
    topRow: { display: "flex", alignItems: "center", gap: 10 },
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
    title: { marginTop: 6, fontSize: 15, fontWeight: 700, color: "#0f172a" },
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

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const meData = await apiGet("/api/me");
        setMe(meData);
        if (!meData?.userId) {
          setList([]);
        } else {
          const qs = `/api/talents?author=${encodeURIComponent(
            meData.userId
          )}&page=0&size=20&sort=createdAt,desc`;
          const data = await apiGet(qs);
          const content = Array.isArray(data?.content) ? data.content : data;
          setList(Array.isArray(content) ? content : []);
        }
      } catch (e) {
        setErr(e.message || "내 게시글을 불러오지 못했어요.");
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

  function MyPostCard({ item }) {
    const tagNames = Array.isArray(item.tagNames)
      ? item.tagNames
      : item.tagName
      ? [item.tagName]
      : [];
    const avatar = toAbs(
      item.authorProfileImageUrl || item.profileImageUrl || item.avatarUrl
    );

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
        <div style={styles.topRow}>
          <div style={styles.avatarSmall}>
            {avatar ? (
              <img src={avatar} alt="avatar" style={styles.avatarImgSmall} />
            ) : null}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.nameLine}>
              <strong>{item.authorName ?? item.authorUserId ?? "익명"}</strong>
              {` · ${item.authorMajor || "전공 미입력"}`}
            </div>
          </div>
        </div>
        <div style={styles.title}>{item.title}</div>

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
        {/* 🔹 상단 뒤로가기 바 */}
        <div style={styles.topBar}>
          <button
            type="button"
            style={styles.backBtn}
            onClick={() => nav(-1)} // 또는 nav("/my")
          >
            ←
          </button>
          <div style={styles.topTitle}>내 게시물</div>
        </div>

        <div style={styles.inner} className="inner-scroll">
          <div style={styles.sectionTitle}>내가 올린 재능글</div>
          {loading && (
            <div style={{ ...styles.smallMuted, marginBottom: 6 }}>
              불러오는 중…
            </div>
          )}
          {err && <div style={{ fontSize: 12, color: "#dc2626" }}>{err}</div>}
          {!loading && !err && list.length === 0 && (
            <div style={styles.smallMuted}>등록한 게시글이 없습니다.</div>
          )}
          {list.map((p) => (
            <MyPostCard key={p.id} item={p} />
          ))}
        </div>
        <BottomBar />
      </div>
    </div>
  );
}
