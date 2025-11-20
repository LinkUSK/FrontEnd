// src/pages/TalentDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/talent/talentDetail.css";
import backIcon from '/images/back-icon.png'

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

/* ============ 공통 API 유틸 ============ */
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
async function apiPost(path, body) {
  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify(body || {}),
  });
  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }
  if (!res.ok) throw new Error(data.message || `POST ${path} ${res.status}`);
  return data;
}

/** 상대 경로를 API_BASE 기준 절대 경로로 변환 */
function toImageUrl(u) {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  const path = u.startsWith("/") ? u : `/${u}`;
  return API_BASE + path;
}

/* ============ 별 아이콘 SVG ============ */
function StarIcon({ filled }) {
  const color = "#2563eb"; // 파란색

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.75l2.75 5.57 6.15.9-4.45 4.34 1.05 6.13L12 16.9l-5.5 2.89 1.05-6.13-4.45-4.34 6.15-.9L12 2.75z"
        fill={filled ? color : "white"}
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ======================================= */

export default function TalentDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [data, setData] = useState(null);
  const [me, setMe] = useState(null);

  const token = useMemo(() => localStorage.getItem(TOKEN_KEY) || "", []);
  const isMyPost = useMemo(
    () =>
      me?.userId && data?.authorUserId ? me.userId === data.authorUserId : false,
    [me, data]
  );

  // ⭐ 별점 요약 + 후기 목록 (작성자 기준)
  const [ratingSummary, setRatingSummary] = useState(null);
  const [reviews, setReviews] = useState([]);

  // 🔹 포트폴리오 이미지 인덱스 + 라이트박스
  const [imgIndex, setImgIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // ⭐ 즐겨찾기 여부
  const [favorited, setFavorited] = useState(false);

  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 상세 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const detail = await apiGet(`/api/talents/${id}`);
        if (!alive) return;
        setData(detail);
      } catch {
        alert("게시글을 불러오지 못했습니다.");
        nav(-1);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, nav]);

  // 내 정보
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const meRes = await apiGet("/api/me");
        if (alive) setMe(meRes);
      } catch {
        if (alive) setMe(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 작성자 기준 별점/후기 가져오기
  useEffect(() => {
    if (!data?.authorUserId) return;
    const authorUserId = data.authorUserId;

    (async () => {
      try {
        // 별점 요약
        const r1 = await fetch(
          `${API_BASE}/api/chat/linku/rating/user-id/${encodeURIComponent(
            authorUserId
          )}`,
          { headers: { Accept: "application/json", ...authHeaders() } }
        );
        if (r1.ok) {
          setRatingSummary(await r1.json());
        }
      } catch (e) {
        console.warn("rating load error", e);
      }

      try {
        // 받은 후기 목록
        const r2 = await fetch(
          `${API_BASE}/api/chat/linku/reviews/user-id/${encodeURIComponent(
            authorUserId
          )}`,
          { headers: { Accept: "application/json", ...authHeaders() } }
        );
        if (r2.ok) {
          setReviews(await r2.json());
        }
      } catch (e) {
        console.warn("reviews load error", e);
      }
    })();
  }, [data?.authorUserId]);

  // 🔹 포트폴리오 이미지 배열
  const portfolioUrls = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data.portfolioImageUrls) && data.portfolioImageUrls.length) {
      return data.portfolioImageUrls.filter(Boolean);
    }
    if (data.portfolioImageUrl) return [data.portfolioImageUrl];
    return [];
  }, [data]);

  // 이미지 개수가 바뀔 때 인덱스 조정
  useEffect(() => {
    if (imgIndex >= portfolioUrls.length) {
      setImgIndex(0);
    }
  }, [portfolioUrls.length, imgIndex]);

  const hasImages = portfolioUrls.length > 0;
  const currentImageUrl = hasImages ? toImageUrl(portfolioUrls[imgIndex]) : null;

  function nextImage(e) {
    if (e) e.stopPropagation();
    if (!hasImages || portfolioUrls.length <= 1) return;
    setImgIndex((prev) => (prev + 1) % portfolioUrls.length);
  }

  function prevImage(e) {
    if (e) e.stopPropagation();
    if (!hasImages || portfolioUrls.length <= 1) return;
    setImgIndex((prev) =>
      prev === 0 ? portfolioUrls.length - 1 : prev - 1
    );
  }

  // ESC / 방향키로 라이트박스 제어
  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, hasImages, portfolioUrls.length]);

  // ⭐ 즐겨찾기 상태 조회
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await apiGet(`/api/talents/${id}/favorite`);
        if (res && typeof res.favorited === "boolean") {
          setFavorited(res.favorited);
        }
      } catch (e) {
        console.warn("favorite check error", e);
      }
    })();
  }, [id, token]);

  // ⭐ 즐겨찾기 토글
  async function toggleFavorite() {
    if (!me) {
      alert("로그인 후 이용 가능합니다.");
      return;
    }
    try {
      const res = await apiPost(`/api/talents/${id}/favorite`, {});
      if (res && typeof res.favorited === "boolean") {
        setFavorited(res.favorited);
      }
    } catch (e) {
      console.error(e);
      alert(e.message || "즐겨찾기 처리 중 오류가 발생했습니다.");
    }
  }

  // ⭐ 프로필 클릭 시 UserProfile 로 이동
  function goAuthorProfile() {
    if (!data?.authorUserId) return;
    nav(`/profile/${encodeURIComponent(data.authorUserId)}`);
  }

  // ⭐ 내 글이 아닐 때: 채팅방 확보 후 이동 + 첫 메시지 draft 전송
  async function goChatWithDraft() {
    const text = (draft || "").trim();
    if (!me) return alert("로그인이 필요합니다.");
    if (isMyPost) return alert("본인 게시글에는 채팅을 보낼 수 없습니다.");
    if (!text) return;

    if (!data?.authorUserId) {
      return alert("게시글 작성자 정보를 찾을 수 없습니다.");
    }

    const talentPostId = Number(id);

    try {
      setCreating(true);

      // 1️⃣ 기존 방 있는지 확인
      let existingRoom = null;
      try {
        const list = await apiGet("/api/chat/my-rooms");
        const arr = Array.isArray(list) ? list : [];

        existingRoom = arr.find((r) => {
          const other = r.otherUser || {};
          return (
            (other.userId && other.userId === data.authorUserId) ||
            (other.id && other.id === data.authorId) ||
            (other.userPk && other.userPk === data.authorId)
          );
        });
      } catch (e) {
        console.warn("채팅 목록 조회 실패", e);
      }

      if (existingRoom && existingRoom.roomId) {
        nav(`/chat/${existingRoom.roomId}`, {
          state: {
            draft: text,
            talentPostId,
          },
        });
        return;
      }

      // 2️⃣ 없으면 새 방 생성
      const r = await apiPost(`/api/chat/rooms`, {
        postId: talentPostId,
        ownerUserId: data.authorUserId,
      });
      if (!r?.roomId) throw new Error("채팅방 생성 실패");

      let hintReceiverId = null;
      const myNumericId = me?.id ?? me?.userPk ?? null;
      if (myNumericId != null && r.ownerId != null && r.otherUserId != null) {
        hintReceiverId = myNumericId === r.ownerId ? r.otherUserId : r.ownerId;
      }

      nav(`/chat/${r.roomId}`, {
        state: {
          draft: text,
          hintReceiverId,
          talentPostId,
        },
      });
    } catch (e) {
      alert(e.message || "채팅 시작에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  }

  // ⭐ 내 글일 때: 삭제
  async function handleDelete() {
    if (!data) return;
    if (!window.confirm("정말 이 게시글을 삭제하시겠습니까?")) return;

    try {
      setDeleting(true);
      const res = await fetch(`${API_BASE}/api/talents/${id}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("삭제에 실패했습니다.");
      }
      alert("게시글이 삭제되었습니다.");
      nav("/home");
    } catch (e) {
      console.error(e);
      alert(e.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  /* ===== 별점/후기 숫자 계산 ===== */
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

  const avatarUrl = (() => {
    const val =
      data?.authorProfileImageUrl || data?.profileImageUrl || data?.avatarUrl;
    if (!val) return null;
    return /^https?:\/\//i.test(val) ? val : API_BASE + val;
  })();

  if (!data) {
    return (
      <div className="talent-frame">
        <div className="talent-card">
          <div className="talent-loading">불러오는 중...</div>
        </div>
      </div>
    );
  }

  const profileClickable = !!data?.authorUserId;

  return (
    <div className="talent-frame">
      <div className="talent-card">
        {/* 상단 바 */}
        <div className="talent-topbar">
          <img
            src={backIcon}
            alt="back"
            className="talent-back-btn"
            onClick={() => nav(-1)}
          />
          <div className="talent-top-title">상세정보</div>

          {me && (
            <button
              type="button"
              className="talent-top-star-btn"
              onClick={toggleFavorite}
              aria-label={favorited ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            >
              <StarIcon filled={favorited} />
            </button>
          )}
        </div>

        {/* 스크롤 영역 */}
        <div className="talent-scroll inner-scroll">
          {/* 포트폴리오 이미지 슬라이드 */}
          {hasImages ? (
            <div
              className="talent-hero-wrap"
              onClick={() => setLightboxOpen(true)}
            >
              <img
                src={currentImageUrl}
                alt="portfolio"
                className="talent-hero-img"
              />
              {portfolioUrls.length > 1 && (
                <>
                  <button
                    type="button"
                    className="talent-hero-nav-btn left"
                    onClick={(e) => prevImage(e)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="talent-hero-nav-btn right"
                    onClick={(e) => nextImage(e)}
                  >
                    ›
                  </button>
                  <div className="talent-hero-pager">
                    {portfolioUrls.map((_, i) => (
                      <div
                        key={i}
                        className={
                          "talent-hero-dot" + (i === imgIndex ? " active" : "")
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="talent-hero-empty">
              포트폴리오 이미지가 없습니다.
            </div>
          )}

          {/* 프로필/이름 (클릭 시 UserProfile 이동) */}
          <div
            className={
              "talent-profile-row" + (profileClickable ? " clickable" : "")
            }
            role={profileClickable ? "button" : undefined}
            tabIndex={profileClickable ? 0 : -1}
            onClick={profileClickable ? goAuthorProfile : undefined}
            onKeyDown={(e) =>
              profileClickable && e.key === "Enter" && goAuthorProfile()
            }
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="talent-avatar" />
            ) : (
              <div className="talent-avatar" />
            )}
            <div>
              <div className="talent-name">{data.authorName}</div>
              <div className="talent-major">
                {data.authorMajor || "전공 미입력"}
              </div>
              <div className="talent-rating-row">
                <span className="talent-rating-star">★</span>
                <span>{avgScore}</span>
                <span className="talent-rating-count">
                  {reviewCount > 0
                    ? ` (${reviewCount}개 후기)`
                    : " (후기 없음)"}
                </span>
              </div>
            </div>
          </div>

          {/* 제목 + 내용 */}
          <div className="talent-title">{data.title}</div>
          <div className="talent-content">{data.content}</div>

          {/* 태그 */}
          <div className="talent-tag-row">
            {(data.tagNames || []).map((t, i) => (
              <span key={i} className="talent-chip">
                {t?.startsWith("#") ? t : `#${t}`}
              </span>
            ))}
          </div>

          {/* 참고사항 */}
          {data.extraNote && (
            <div className="talent-extra-note">
              <strong>참고사항</strong>
              <br />
              {data.extraNote}
            </div>
          )}

          {/* 후기 섹션 */}
          <div className="talent-review-header-title">
            후기 {reviewCount > 0 ? `(${reviewCount})` : ""}
          </div>

          {reviews.length === 0 && (
            <div className="talent-review-empty">
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

            const comment =
              item.content || item.comment || "내용이 없습니다.";

            const createdAt = item.createdAt;
            const dateLabel = createdAt ? String(createdAt).slice(0, 10) : "";

            return (
              <div key={item.id} className="talent-review-card">
                <div className="talent-review-header-row">
                  <div className="talent-review-name">
                    {name} · {major}
                  </div>
                  <div>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={
                          "talent-review-star" + (i < rating ? " filled" : "")
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <div className="talent-review-body">{comment}</div>
                <div className="talent-review-date">{dateLabel}</div>
              </div>
            );
          })}

          {!me && (
            <div className="talent-login-hint">
              채팅을 사용하려면 먼저 로그인해주세요.
            </div>
          )}
        </div>

        {/* 하단 바 */}
        {me && !isMyPost && (
          <div className="talent-bottom-wrap">
            <div className="talent-bottom-inner">
              <input
                className="talent-bottom-input"
                placeholder="안녕하세요, 궁금하신 점 문의드려요."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goChatWithDraft()}
                disabled={creating}
              />
              <button
                type="button"
                className="talent-bottom-send"
                onClick={goChatWithDraft}
                disabled={creating}
              >
                {creating ? "이동 중…" : "보내기"}
              </button>
            </div>
          </div>
        )}

        {me && isMyPost && (
          <div className="talent-bottom-wrap">
            <div className="talent-bottom-inner">
              <button
                type="button"
                className="talent-delete-btn"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "삭제 중…" : "삭제하기"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 라이트박스 */}
      {lightboxOpen && hasImages && (
        <div
          className="talent-lightbox-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          <div className="talent-lightbox-img-wrap">
            <img
              src={currentImageUrl}
              alt={`portfolio-large-${imgIndex}`}
              className="talent-lightbox-img"
            />
          </div>

          <button
            type="button"
            className="talent-lightbox-close"
            onClick={() => setLightboxOpen(false)}
          >
            ✕
          </button>

          {portfolioUrls.length > 1 && (
            <>
              <button
                type="button"
                className="talent-lightbox-nav-btn left"
                onClick={(e) => prevImage(e)}
              >
                ‹
              </button>
              <button
                type="button"
                className="talent-lightbox-nav-btn right"
                onClick={(e) => nextImage(e)}
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}