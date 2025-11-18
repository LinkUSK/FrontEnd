// src/pages/MyLinks.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

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

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiGet(path) {
  const res = await fetch(API_BASE + path, {
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

// 프로필 이미지 url 보정
function resolveImgUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

// 이름에서 한 글자 이니셜
function initialOf(name) {
  if (!name) return "?";
  const t = name.trim();
  return t ? t[0] : "?";
}

export default function MyLinks() {
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
      display: "flex",
      alignItems: "center",
    },

    // 겹치는 아바타
    avatarStack: {
      position: "relative",
      width: 64,
      height: 44,
      flex: "0 0 64px",
    },
    avatarCircleBase: {
      position: "absolute",
      top: 4,
      width: 36,
      height: 36,
      borderRadius: "50%",
      background: "#e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 14,
      fontWeight: 700,
      color: "#4b5563",
      overflow: "hidden",
    },
    avatarBack: {
      left: 4,
      zIndex: 1,
    },
    avatarFront: {
      left: 22,
      zIndex: 2,
      boxShadow: "0 0 0 2px #ffffff",
    },
    avatarImg: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },

    cardTextWrap: {
      marginLeft: 12,
      flex: 1,
      minWidth: 0,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: 700,
      color: "#0f172a",
      marginBottom: 4,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    cardSub: {
      fontSize: 13,
      color: "#4b5563",
      marginBottom: 4,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    cardDate: {
      fontSize: 12,
      color: "#9ca3af",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },

    smallMuted: { fontSize: 13, color: "#94a3b8", marginTop: 6 },

    bottomWrap: {
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      background: "#fff",
      borderTop: "1px solid #e5e7eb",
      zIndex: 50, // 🔹 하단바가 카드/아바타 위에 오도록
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

  // 데이터 불러오기
  useEffect(() => {
    (async () => {
      const t = getToken();
      if (!t) {
        nav("/login");
        return;
      }
      try {
        setLoading(true);
        setErr("");
        const data = await apiGet("/api/chat/linku/connections/me");
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e.message || "링크유 기록을 불러오지 못했어요.");
        if (String(e).includes("401")) {
          nav("/login");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

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

  function renderAvatarCircle(src, name, extraStyle) {
    const url = resolveImgUrl(src);
    return (
      <div style={{ ...styles.avatarCircleBase, ...extraStyle }}>
        {url ? (
          <img
            src={url}
            alt={name || "profile"}
            style={styles.avatarImg}
            onError={(e) => {
              // 이미지 깨지면 이니셜로 대체
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement.textContent = initialOf(name);
            }}
          />
        ) : (
          initialOf(name)
        )}
      </div>
    );
  }

  function LinkCard({ item }) {
    const title = `${item.partnerName || "상대"}님과의 링크유`;
    const sub = item.talentTitle || "";
    const period =
      item.period ||
      (item.startDate && item.endDate
        ? `${item.startDate} ~ ${item.endDate}`
        : item.startDate || "");

    return (
      <div
        style={styles.card}
        onClick={() => item.roomId && nav(`/chat/${item.roomId}`)}
      >
        {/* 겹치는 프로필 사진 */}
        <div style={styles.avatarStack}>
          {/* 뒤쪽 : 상대방 */}
          {renderAvatarCircle(
            item.partnerProfileImageUrl,
            item.partnerName,
            styles.avatarBack
          )}
          {/* 앞쪽 : 제안자 */}
          {renderAvatarCircle(
            item.proposerProfileImageUrl,
            item.proposerName,
            styles.avatarFront
          )}
        </div>

        {/* 텍스트 영역 */}
        <div style={styles.cardTextWrap}>
          <div style={styles.cardTitle}>{title}</div>
          {sub && <div style={styles.cardSub}>{sub}</div>}
          {period && <div style={styles.cardDate}>{period}</div>}
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
            onClick={() => nav(-1)}
          >
            ←
          </button>
          <div style={styles.topTitle}>내 링크유</div>
        </div>

        {/* 내용 영역 (스크롤) */}
        <div style={styles.inner} className="inner-scroll">
          {loading && <div style={styles.smallMuted}>불러오는 중…</div>}
          {err && (
            <div style={{ ...styles.smallMuted, color: "#dc2626" }}>{err}</div>
          )}
          {!loading && !err && items.length === 0 && (
            <div style={styles.smallMuted}>아직 링크유 기록이 없습니다.</div>
          )}
          {items.map((it) => (
            <LinkCard key={it.connectionId} item={it} />
          ))}
        </div>

        <BottomBar />
      </div>
    </div>
  );
}
