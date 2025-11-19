// src/pages/UserProfile.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/userProfile.css";

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

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
      <div className="userprofile-loading">
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
    <div className="userprofile-frame">
      <div className="userprofile-wrap">
        {/* 상단 전체 스크롤 영역 */}
        <div className="inner-scroll userprofile-inner">
          {/* 상단 뒤로가기 */}
          <div className="userprofile-topbar">
            <button
              type="button"
              className="userprofile-back-btn"
              onClick={() => nav(-1)}
            >
              ←
            </button>
            <div className="userprofile-top-title">프로필</div>
          </div>

          {/* 프로필 메인 카드 */}
          <div className="userprofile-main-card">
            <div className="userprofile-main-header">
              <div className="userprofile-avatar">
                {avatarSrc && (
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="userprofile-avatar-img"
                  />
                )}
              </div>

              <div className="userprofile-main-info">
                <div className="userprofile-name-row">
                  <div className="userprofile-name">{user.username}</div>
                </div>

                <div className="userprofile-verify-badge">
                  <span className="userprofile-verify-icon">✔</span>
                  <span>학교 인증 완료</span>
                </div>

                <div className="userprofile-info-row">
                  <span>📅</span>
                  <span>{joinedLabel || "가입일 정보 없음"}</span>
                </div>

                <div className="userprofile-info-row">
                  <span>🎓</span>
                  <span>{user.major || "전공 미입력"}</span>
                </div>

                <div className="userprofile-info-row userprofile-info-row-link">
                  <span>🔗</span>
                  <a
                    href={`mailto:${user.email}`}
                    className="userprofile-email-link"
                  >
                    {user.email}
                  </a>
                </div>
              </div>
            </div>

            {/* 하단 통계 영역 */}
            <div className="userprofile-stats-row">
              <div className="userprofile-stat">
                <div className="userprofile-stat-label">진행 중인 협업</div>
                <div className="userprofile-stat-value">{ongoingCount}</div>
              </div>

              <div className="userprofile-stat-divider" />

              <div className="userprofile-stat">
                <div className="userprofile-stat-label">진행한 협업</div>
                <div className="userprofile-stat-value">{acceptedCount}</div>
              </div>

              <div className="userprofile-stat-divider" />

              <div className="userprofile-stat">
                <div className="userprofile-stat-label">협업 만족도</div>
                <div className="userprofile-stat-value userprofile-stat-value-rating">
                  <span>{avgScore}</span>
                  <span className="userprofile-rating-star-main">★</span>
                </div>
              </div>
            </div>
          </div>

          {/* 받은 후기 리스트 */}
          <div className="userprofile-reviews-section">
            <div className="userprofile-reviews-title">
              받은 후기 ({reviewCount})
            </div>

            {reviews.length === 0 && (
              <div className="userprofile-reviews-empty">
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
              const dateLabel = createdAt ? String(createdAt).slice(0, 10) : "";

              return (
                <button
                  key={item.id}
                  type="button"
                  className="userprofile-review-card"
                  onClick={() => nav(`/reviews/${item.id}`)}
                >
                  <div className="userprofile-review-header-row">
                    <div className="userprofile-review-name">
                      {name} · {major}
                    </div>
                    <div className="userprofile-review-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={
                            i < rating
                              ? "userprofile-review-star filled"
                              : "userprofile-review-star"
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="userprofile-review-body">{comment}</div>
                  <div className="userprofile-review-date">{dateLabel}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}