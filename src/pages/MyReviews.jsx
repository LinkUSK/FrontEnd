// src/pages/MyReviews.jsx
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

function formatYmd(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export default function MyReviews() {
  const nav = useNavigate();
  const loc = useLocation();

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
    // 🔹 상단 뒤로가기 바 (MyFavorites와 동일 톤)
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

    // 🔹 카드 크기: width / padding / radius 를 MyPosts / MyFavorites 와 맞춤
    reviewCard: {
      width: "100%",
      boxSizing: "border-box",
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: 14,
      marginTop: 10,
    },
    reviewHeaderRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    reviewName: { fontWeight: 700, fontSize: 14, color: "#0f172a" },
    reviewBody: { fontSize: 13, color: "#111827", marginTop: 4 },
    reviewDate: {
      marginTop: 8,
      fontSize: 12,
      color: "#94a3b8",
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
        const data = await apiGet("/api/chat/linku/reviews/me");
        const list = Array.isArray(data) ? data : data?.content || [];
        setList(Array.isArray(list) ? list : []);
      } catch (e) {
        setErr(e.message || "받은 후기를 불러오지 못했어요.");
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

  function ReviewCard({ item }) {
    const reviewer = item.reviewer || {};
    const name =
      item.reviewerName ||
      reviewer.name ||
      reviewer.username ||
      item.reviewerUserId ||
      "익명";
    const major =
      item.reviewerMajor || reviewer.major || reviewer.department || "전공 미입력";

    const rawScore =
      typeof item.score === "number"
        ? item.score
        : typeof item.rating === "number"
        ? item.rating
        : typeof item.kindnessScore === "number"
        ? item.kindnessScore
        : null;
    const rating =
      rawScore == null ? 0 : Math.max(0, Math.min(5, Number(rawScore) || 0));

    const comment = item.comment || item.content || "내용이 없습니다.";
    const createdAt = item.createdAt;

    return (
      <div style={styles.reviewCard}>
        <div style={styles.reviewHeaderRow}>
          <div style={styles.reviewName}>
            {name} · {major}
          </div>
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                style={{
                  color: i < rating ? "#fbbf24" : "#e5e7eb",
                  fontSize: 14,
                }}
              >
                ★
              </span>
            ))}
          </div>
        </div>
        <div style={styles.reviewBody}>{comment}</div>
        <div style={styles.reviewDate}>{formatYmd(createdAt)}</div>
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
          <div style={styles.topTitle}>받은 후기</div>
        </div>

        <div style={styles.inner} className="inner-scroll">
          <div style={styles.sectionTitle}>나에게 달린 후기</div>
          {loading && (
            <div style={{ ...styles.smallMuted, marginBottom: 6 }}>
              불러오는 중…
            </div>
          )}
          {err && <div style={{ fontSize: 12, color: "#dc2626" }}>{err}</div>}
          {!loading && !err && list.length === 0 && (
            <div style={styles.smallMuted}>아직 받은 후기가 없습니다.</div>
          )}
          {list.map((r) => (
            <ReviewCard key={r.id} item={r} />
          ))}
        </div>
        <BottomBar />
      </div>
    </div>
  );
}
