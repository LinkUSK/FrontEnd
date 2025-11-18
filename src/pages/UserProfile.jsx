// src/pages/UserProfile.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

/* 🔹 Home.jsx와 동일한 공통 스타일 주입 (body overflow hidden + .inner-scroll 스크롤바 숨김) */
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

const styles = {
  reviewCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    boxSizing: "border-box",
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

  frame: {
    minHeight: "100vh",
    background: "#eef2f7",
    display: "flex",
    justifyContent: "center",
  },
  wrap: {
    maxWidth: 420,
    width: "100%",
    height: "100vh", // 🔹 뷰포트 기준 고정 높이
    maxHeight: 820,
    background: "#f8fafc",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  },
  inner: {
    flex: 1,
    overflowY: "auto", // 🔹 이 영역만 스크롤
    padding: "12px 16px 24px",
    boxSizing: "border-box",
  },
};

function authHeaders() {
  const t = localStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function UserProfile() {
  const { userId } = useParams();
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        // 상대 프로필
        const res = await fetch(`${API_BASE}/api/auth/users/${userId}`, {
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const data = await res.json();
        setUser(data);
      } catch (e) {
        console.error(e);
        alert("프로필을 불러오지 못했습니다.");
      }

      try {
        // 별점 요약 (진행중/진행한 협업 수 포함)
        const r = await fetch(
          `${API_BASE}/api/chat/linku/rating/user-id/${encodeURIComponent(
            userId
          )}`,
          { headers: { Accept: "application/json", ...authHeaders() } }
        );
        if (r.ok) {
          setRatingSummary(await r.json());
        }
      } catch (e) {
        console.warn("rating load error", e);
      }

      try {
        // 받은 후기 목록
        const r = await fetch(
          `${API_BASE}/api/chat/linku/reviews/user-id/${encodeURIComponent(
            userId
          )}`,
          { headers: { Accept: "application/json", ...authHeaders() } }
        );
        if (r.ok) {
          setReviews(await r.json());
        }
      } catch (e) {
        console.warn("reviews load error", e);
      }
    })();
  }, [userId]);

  // 가입일: 년-월-일만
  const joinedLabel = useMemo(() => {
    if (!user?.createdAt) return "";
    const raw = String(user.createdAt);
    const ymd = raw.length >= 10 ? raw.slice(0, 10) : raw;
    return `${ymd} 가입`;
  }, [user?.createdAt]);

  const avgScore =
    ratingSummary && typeof ratingSummary.averageScore === "number"
      ? ratingSummary.averageScore.toFixed(1)
      : ratingSummary && ratingSummary.averageScore
      ? Number(ratingSummary.averageScore).toFixed(1)
      : "-";

  const reviewCount =
    ratingSummary && typeof ratingSummary.reviewCount === "number"
      ? ratingSummary.reviewCount
      : ratingSummary && ratingSummary.reviewCount
      ? Number(ratingSummary.reviewCount)
      : 0;

  const ongoingCount =
    ratingSummary && typeof ratingSummary.ongoingCount === "number"
      ? ratingSummary.ongoingCount
      : 0;

  const acceptedCount =
    ratingSummary && typeof ratingSummary.acceptedCount === "number"
      ? ratingSummary.acceptedCount
      : 0;

  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#eef2f7",
        }}
      >
        로딩 중...
      </div>
    );
  }

  const avatarSrc = user.profileImageUrl
    ? `${API_BASE}${user.profileImageUrl.startsWith("/") ? "" : "/"}${
        user.profileImageUrl
      }`
    : null;

  return (
    <div style={styles.frame}>
      <div style={styles.wrap}>
        {/* 🔹 Home처럼 카드 안 content 전체를 inner-scroll로 감싸서 스크롤 */}
        <div className="inner-scroll" style={styles.inner}>
          {/* 상단 뒤로가기 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <button
              onClick={() => nav(-1)}
              style={{
                border: 0,
                background: "transparent",
                fontSize: 20,
                cursor: "pointer",
                marginRight: 4,
              }}
            >
              ←
            </button>
            <div style={{ fontWeight: 800, fontSize: 18 }}>프로필</div>
          </div>

          {/* 프로필 메인 카드 */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 24,
              border: "1px solid #e5e7eb",
              padding: 16,
              boxSizing: "border-box",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", gap: 12 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "#e5e7eb",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {avatarSrc && (
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    {user.username}
                  </div>
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  <span>✔</span>
                  <span>학교 인증 완료</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: "#4b5563",
                    marginTop: 4,
                  }}
                >
                  <span>📅</span>
                  <span>{joinedLabel || "가입일 정보 없음"}</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: "#4b5563",
                    marginTop: 4,
                  }}
                >
                  <span>🎓</span>
                  <span>{user.major || "전공 미입력"}</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: "#2563eb",
                    marginTop: 4,
                    wordBreak: "break-all",
                  }}
                >
                  <span>🔗</span>
                  <a
                    href={`mailto:${user.email}`}
                    style={{ color: "#2563eb", textDecoration: "underline" }}
                  >
                    {user.email}
                  </a>
                </div>
              </div>
            </div>

            {/* 하단 통계 영역 */}
            <div
              style={{
                display: "flex",
                borderTop: "1px solid #e5e7eb",
                marginTop: 12,
                paddingTop: 12,
                justifyContent: "space-between",
                textAlign: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#9ca3af",
                    marginBottom: 4,
                  }}
                >
                  진행 중인 협업
                </div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>
                  {ongoingCount}
                </div>
              </div>

              <div
                style={{
                  width: 1,
                  background: "#e5e7eb",
                  margin: "0 8px",
                }}
              />

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#9ca3af",
                    marginBottom: 4,
                  }}
                >
                  진행한 협업
                </div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>
                  {acceptedCount}
                </div>
              </div>

              <div
                style={{
                  width: 1,
                  background: "#e5e7eb",
                  margin: "0 8px",
                }}
              />

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#9ca3af",
                    marginBottom: 4,
                  }}
                >
                  협업 만족도
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <span>{avgScore}</span>
                  <span style={{ color: "#f59e0b" }}>★</span>
                </div>
              </div>
            </div>
          </div>

          {/* 받은 후기 리스트 (여기도 같은 스크롤 영역 안) */}
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                marginBottom: 8,
              }}
            >
              받은 후기 ({reviewCount})
            </div>

            {reviews.length === 0 && (
              <div
                style={{
                  fontSize: 13,
                  color: "#9ca3af",
                }}
              >
                아직 받은 후기가 없습니다.
              </div>
            )}

            {reviews.map((item) => {
              const reviewer = item.reviewer || {};

              const name =
                item.reviewerName ||
                reviewer.name ||
                reviewer.username ||
                item.reviewerUserId ||
                "익명";

              const major =
                item.reviewerMajor ||
                reviewer.major ||
                reviewer.department ||
                "전공 미입력";

              const rawScore =
                typeof item.score === "number"
                  ? item.score
                  : typeof item.rating === "number"
                  ? item.rating
                  : typeof item.kindnessScore === "number"
                  ? item.kindnessScore
                  : null;

              const rating =
                rawScore == null
                  ? 0
                  : Math.max(0, Math.min(5, Number(rawScore) || 0));

              const comment = item.content || item.comment || "내용이 없습니다.";

              const createdAt = item.createdAt;
              const dateLabel = createdAt ? createdAt.slice(0, 10) : "";

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => nav(`/reviews/${item.id}`)}
                  style={{
                    ...styles.reviewCard,
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
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

                  <div style={styles.reviewDate}>{dateLabel}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
