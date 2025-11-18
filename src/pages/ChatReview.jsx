// src/pages/ChatReview.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

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

export default function ChatReview() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const otherUser = loc.state?.otherUser || null;

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const [relationRating, setRelationRating] = useState("BEST");
  const [kindnessScore, setKindnessScore] = useState(5);
  const [text, setText] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const meRes = await apiGet("/api/me");
        if (!alive) return;
        setMe(meRes);
      } catch {
        alert("로그인이 필요합니다.");
        nav("/login");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [nav]);

  const myName = me?.name || me?.nickname || me?.userId || "회원";
  const otherName =
    otherUser?.name || otherUser?.nickname || otherUser?.userId || "상대";

  async function handleSubmit() {
    if (kindnessScore < 1 || kindnessScore > 5) {
      alert("별점을 선택해주세요.");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/api/chat/rooms/${roomId}/linku/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          credentials: "include",
          body: JSON.stringify({
            relationRating,
            kindnessScore,
            content: text.trim() || null,
          }),
        }
      );
      const raw = await res.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw };
      }
      if (!res.ok) throw new Error(data.message || "후기 전송 실패");

      alert("후기를 남겼습니다. 감사합니다!");

      // ✅ 올바른 채팅방 경로로 돌아가기
      nav(`/chat/${roomId}`);
    } catch (e) {
      console.error(e);
      alert(e.message || "후기 전송에 실패했습니다.");
    }
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
      maxHeight: 820,
      background: "#ffffff",
      borderRadius: 0,
      boxShadow: "0 0 0 rgba(0,0,0,0)",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
    },
    top: {
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      background: "#fff",
      borderBottom: "1px solid #e5e7eb",
    },
    body: {
      flex: 1,
      padding: "18px 18px 12px",
      overflowY: "auto",
      boxSizing: "border-box",
      background: "#f9fafb",
    },
    title: {
      fontSize: 18,
      fontWeight: 800,
      lineHeight: 1.4,
      marginBottom: 18,
    },
    ratingTabs: {
      display: "flex",
      gap: 10,
      marginBottom: 20,
    },
    ratingSquare: (active) => ({
      flex: 1,
      borderRadius: 12,
      background: active ? "#eff6ff" : "#f3f4f6",
      border: active ? "2px solid #2563eb" : "1px solid #e5e7eb",
      height: 80,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: active ? "#1d4ed8" : "#6b7280",
      fontWeight: active ? 700 : 500,
      fontSize: 13,
    }),
    ratingSquareLabel: {
      marginTop: 8,
    },
    starBox: {
      borderRadius: 16,
      background: "#eff6ff",
      padding: 16,
      marginBottom: 20,
    },
    starRow: {
      display: "flex",
      justifyContent: "center",
      gap: 6,
      marginTop: 10,
    },
    star: (active) => ({
      fontSize: 26,
      cursor: "pointer",
      color: active ? "#1d4ed8" : "#cbd5f5",
    }),
    textareaLabel: {
      fontSize: 14,
      fontWeight: 600,
      marginBottom: 6,
    },
    textareaSub: {
      fontSize: 12,
      color: "#9ca3af",
      marginLeft: 4,
      fontWeight: 400,
    },
    textarea: {
      width: "100%",
      minHeight: 120,
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      padding: "10px 12px",
      fontSize: 13,
      resize: "none",
      boxSizing: "border-box",
      background: "#ffffff",
    },
    bottom: {
      flexShrink: 0,
      padding: "10px 16px 16px",
      borderTop: "1px solid #e5e7eb",
      background: "#ffffff",
    },
    submitBtn: {
      width: "100%",
      borderRadius: 999,
      border: 0,
      padding: "12px 0",
      background: "#2563eb",
      color: "#ffffff",
      fontWeight: 700,
      fontSize: 15,
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.stage}>
      <div style={styles.card}>
        {/* 상단바 */}
        <div style={styles.top}>
          <button
            onClick={() => nav(-1)}
            style={{
              border: 0,
              background: "transparent",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ←
          </button>
          <div style={{ fontWeight: 800 }}>후기 남기기</div>
        </div>

        {/* 내용 */}
        <div style={styles.body}>
          {loading ? (
            <div
              style={{ textAlign: "center", marginTop: 40, color: "#9ca3af" }}
            >
              로딩 중…
            </div>
          ) : (
            <>
              <div style={styles.title}>
                {myName}님,
                <br />
                {otherName}님과 링크유는 어떠셨나요?
              </div>

              {/* 상단 세 가지 선택 */}
              <div style={styles.ratingTabs}>
                <div
                  style={styles.ratingSquare(relationRating === "BAD")}
                  onClick={() => setRelationRating("BAD")}
                >
                  <div>😢</div>
                  <div style={styles.ratingSquareLabel}>별로예요</div>
                </div>
                <div
                  style={styles.ratingSquare(relationRating === "GOOD")}
                  onClick={() => setRelationRating("GOOD")}
                >
                  <div>🙂</div>
                  <div style={styles.ratingSquareLabel}>좋아요</div>
                </div>
                <div
                  style={styles.ratingSquare(relationRating === "BEST")}
                  onClick={() => setRelationRating("BEST")}
                >
                  <div>🤩</div>
                  <div style={styles.ratingSquareLabel}>최고예요</div>
                </div>
              </div>

              {/* 친절도 별점 */}
              <div style={styles.starBox}>
                <div style={{ fontSize: 13, color: "#4b5563" }}>
                  {otherName}님은 친절하셨나요?
                </div>
                <div style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <span
                      key={v}
                      style={styles.star(v <= kindnessScore)}
                      onClick={() => setKindnessScore(v)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              {/* 텍스트 후기 */}
              <div style={styles.textareaLabel}>
                따뜻한 후기를 남겨보아요.
                <span style={styles.textareaSub}>(선택사항)</span>
              </div>
              <textarea
                style={styles.textarea}
                placeholder="여기에 적어주세요. (선택사항)"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </>
          )}
        </div>

        {/* 하단 버튼 */}
        <div style={styles.bottom}>
          <button
            type="button"
            style={styles.submitBtn}
            onClick={handleSubmit}
            disabled={loading}
          >
            후기 남기기
          </button>
        </div>
      </div>
    </div>
  );
}
