// src/pages/Chat.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

/* ============ API 유틸 ============ */
function authHeaders() {
  const t = localStorage.getItem(TOKEN_KEY);
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
/* ================================= */

export default function Chat() {
  const nav = useNavigate();
  const loc = useLocation();

  const [me, setMe] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = useMemo(() => localStorage.getItem(TOKEN_KEY) || "", []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 내 정보
        try {
          const meRes = await apiGet("/api/me");
          if (alive) setMe(meRes);
        } catch {
          if (alive) setMe(null);
        }

        // 내 채팅방 목록
        const list = await apiGet("/api/chat/my-rooms");
        const arr = Array.isArray(list) ? list : [];

        // 백엔드에서 보내준 방을 그대로 사용
        if (alive) setRooms(arr);
      } catch (e) {
        console.error(e);
        alert("채팅 목록을 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, loc.key]); // 목록 페이지로 돌아왔을 때 자연 새로고침

  const styles = {
    wrap: {
      maxWidth: 420,
      margin: "0 auto",
      minHeight: "100vh",
      background: "#f8fafc",
      paddingBottom: 6,
    },
    top: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
    },
    list: { padding: 12, display: "grid", gap: 8 },
    item: {
      display: "flex",
      gap: 12,
      alignItems: "center",
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      padding: 12,
      cursor: "pointer",
    },
    // 🔹 아바타 + 뱃지 감싸는 래퍼
    avatarWrap: {
      position: "relative",
      width: 44,
      height: 44,
      flexShrink: 0,
    },
    avatar: {
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      objectFit: "cover",
      background: "#e5e7eb",
    },
    // 🔹 프로필 위에 겹쳐지는 빨간 뱃지
    avatarBadge: {
      position: "absolute",
      right: -2,
      bottom: -2,
      minWidth: 18,
      height: 18,
      padding: "0 4px",
      borderRadius: 999,
      background: "#ef4444",
      color: "#fff",
      fontSize: 11,
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "2px solid #fff",
      boxSizing: "border-box",
    },
    name: { fontWeight: 700 },
    // 🔽 마지막 메시지: 2줄까지만 보이고 나머지는 ... 처리
    last: {
      color: "#64748b",
      fontSize: 13,
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "-webkit-box",
      WebkitLineClamp: 2, // 최대 2줄
      WebkitBoxOrient: "vertical",
      wordBreak: "break-word",
    },
    meta: { marginLeft: "auto", textAlign: "right" },
    time: { fontSize: 12, color: "#94a3b8" },
    // 예전 오른쪽 큰 뱃지 – 필요 없으면 그대로 두고 미사용
    badge: {
      marginTop: 6,
      minWidth: 22,
      height: 22,
      borderRadius: 999,
      background: "#ef4444",
      color: "#fff",
      fontSize: 12,
      fontWeight: 700,
      display: "inline-grid",
      placeItems: "center",
      padding: "0 6px",
    },
    empty: { padding: 16, color: "#94a3b8", textAlign: "center" },

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
          <div style={styles.tab(is("/create"))} onClick={() => nav("/create")}>
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

  function fmt(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    const hh = d.getHours().toString().padStart(2, "0");
    const mi = d.getMinutes().toString().padStart(2, "0");
    return `${mm}/${dd} ${hh}:${mi}`;
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.top}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>채팅</div>
      </div>

      {loading ? (
        <div style={styles.empty}>불러오는 중…</div>
      ) : rooms.length === 0 ? (
        <div style={styles.empty}>
          채팅방이 없습니다. 게시글에서 채팅을 시작해보세요.
        </div>
      ) : (
        <div style={styles.list}>
          {rooms.map((r) => {
            const other = r.otherUser || {};
            const avatarUrl = other.avatar
              ? /^https?:\/\//i.test(other.avatar)
                ? other.avatar
                : API_BASE + other.avatar
              : null;

            const unread = r.unread || 0;
            const unreadLabel = unread > 99 ? "99+" : unread;

            return (
              <div
                key={r.roomId}
                style={styles.item}
                onClick={() => nav(`/chat/${r.roomId}`)}
              >
                {/* 🔹 프로필 + 겹쳐진 뱃지 */}
                <div style={styles.avatarWrap}>
                  {avatarUrl ? (
                    <img alt="avatar" src={avatarUrl} style={styles.avatar} />
                  ) : (
                    <div style={styles.avatar} />
                  )}
                  {unread > 0 && (
                    <div style={styles.avatarBadge}>{unreadLabel}</div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.name}>
                    {other.name || other.userId || "사용자"}{" "}
                    {other.major ? ` · ${other.major}` : ""}
                  </div>
                  <div style={styles.last}>
                    {r.lastMessage?.content || "대화를 시작해보세요."}
                  </div>
                </div>
                <div style={styles.meta}>
                  <div style={styles.time}>
                    {fmt(r.lastMessage?.createdAt)}
                  </div>
                  {/* 오른쪽 큰 뱃지는 필요 없으니 주석 처리
                  {unread > 0 && (
                    <div style={styles.badge}>{unreadLabel}</div>
                  )}
                  */}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomBar />
    </div>
  );
}
