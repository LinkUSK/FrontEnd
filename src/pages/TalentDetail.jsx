// src/pages/TalentDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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
        fill={filled ? color : "white"} // 채워진/비채워진
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

  // 🔹 포트폴리오 이미지 배열 (신규: portfolioImageUrls / 기존: portfolioImageUrl)
  const portfolioUrls = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data.portfolioImageUrls) && data.portfolioImageUrls.length) {
      return data.portfolioImageUrls.filter(Boolean);
    }
    if (data.portfolioImageUrl) return [data.portfolioImageUrl];
    return [];
  }, [data]);

  // 이미지 개수가 바뀔 때 인덱스 안전하게 조정
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

  // ESC로 라이트박스 닫기
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

    // talentPostId: 현재 상세 페이지의 재능글 id
    const talentPostId = Number(id);

    try {
      setCreating(true);

      // 1️⃣ 내 채팅방 목록에서 이 작성자와 이미 만들어진 방이 있는지 찾기
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
        console.warn("채팅 목록 조회 실패 (무시하고 새 방 생성 시도 가능)", e);
      }

      // ✅ 이미 방이 있으면 그 방으로 이동 (이번 LinkU는 이 게시글 기준이 되도록 postId state에 실어줌)
      if (existingRoom && existingRoom.roomId) {
        nav(`/chat/${existingRoom.roomId}`, {
          state: {
            draft: text,
            talentPostId, // 🔹 이번 대화의 LinkU는 이 게시글 기준
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

      // receiverId 힌트 계산
      let hintReceiverId = null;
      const myNumericId = me?.id ?? me?.userPk ?? null;
      if (myNumericId != null && r.ownerId != null && r.otherUserId != null) {
        hintReceiverId = myNumericId === r.ownerId ? r.otherUserId : r.ownerId;
      }

      nav(`/chat/${r.roomId}`, {
        state: {
          draft: text,
          hintReceiverId,
          talentPostId, // 🔹 새로 만든 방도 이 게시글 기준으로 LinkU 기록
        },
      });
    } catch (e) {
      alert(e.message || "채팅 시작에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  }

  // ⭐ 내 글일 때: 삭제하기 버튼만
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

  /* ===== 스타일 ===== */
  const styles = {
    frame: {
      minHeight: "100vh",
      background: "#eef2f7",
      display: "flex",
      justifyContent: "center",
    },
    card: {
      width: "100%",
      maxWidth: 420,
      height: "100vh",
      maxHeight: 820,
      background: "#f8fafc",
      boxSizing: "border-box",
      padding: "8px 16px 10px",
      display: "flex",
      flexDirection: "column",
    },
    top: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "4px 0 8px",
      flexShrink: 0,
    },
    topTitle: {
      fontWeight: 800,
      flex: 1,
    },
    topStarBtn: {
      border: 0,
      background: "transparent",
      width: 32,
      height: 32,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
      cursor: "pointer",
    },
    scroll: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 16,
    },

    // 🔹 메인 이미지 영역
    heroWrap: {
      position: "relative",
      width: "100%",
      borderRadius: 16,
      overflow: "hidden",
      background: "#e2e8f0",
    },
    hero: {
      width: "100%",
      aspectRatio: "16/9",
      objectFit: "cover",
      display: "block",
      cursor: "pointer",
    },
    heroEmpty: {
      width: "100%",
      aspectRatio: "16/9",
      borderRadius: 16,
      background: "#e2e8f0",
      display: "grid",
      placeItems: "center",
      color: "#94a3b8",
      fontSize: 13,
    },
    heroNavBtn: (pos) => ({
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      [pos]: 6,
      width: 28,
      height: 28,
      borderRadius: "999px",
      border: "none",
      background: "rgba(15,23,42,0.6)",
      color: "#fff",
      cursor: "pointer",
      fontSize: 16,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }),
    heroPager: {
      position: "absolute",
      bottom: 8,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      gap: 6,
    },
    heroDot: (active) => ({
      width: active ? 8 : 6,
      height: active ? 8 : 6,
      borderRadius: "999px",
      background: active ? "#f97316" : "rgba(148,163,184,0.8)",
    }),

    profileRow: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginTop: 12,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: "50%",
      objectFit: "cover",
      background: "#e2e8f0",
      flexShrink: 0,
    },
    name: { fontSize: 16, fontWeight: 800, color: "#0f172a" },
    major: { fontSize: 13, color: "#6b7280", marginTop: 2 },
    ratingRow: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
      fontSize: 13,
      color: "#4b5563",
    },
    ratingStar: { color: "#f59e0b", fontSize: 14 },
    title: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: 800,
      color: "#0f172a",
    },
    content: {
      marginTop: 10,
      fontSize: 14,
      color: "#334155",
      lineHeight: 1.6,
      whiteSpace: "pre-wrap",
    },
    tagRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 12,
    },
    chip: {
      fontSize: 11,
      padding: "6px 10px",
      borderRadius: 999,
      background: "#f1f5f9",
      color: "#475569",
    },
    extraNote: {
      marginTop: 10,
      padding: 12,
      borderRadius: 12,
      background: "#f1f5f9",
      color: "#334155",
      fontSize: 13,
      lineHeight: 1.5,
    },
    reviewHeaderTitle: {
      fontWeight: 700,
      fontSize: 15,
      marginTop: 20,
      marginBottom: 8,
    },
    reviewEmpty: { fontSize: 13, color: "#9ca3af" },
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
    bottomWrap: {
      flexShrink: 0,
      borderTop: "1px solid #e5e7eb",
      background: "#ffffff",
      marginLeft: -16,
      marginRight: -16,
      paddingTop: 6,
    },
    bottomInner: {
      maxWidth: 420,
      margin: "0 auto",
      display: "flex",
      gap: 8,
      padding: "8px 16px 6px",
      boxSizing: "border-box",
    },
    deleteBtn: {
      flex: 1,
      borderRadius: 12,
      padding: "10px 12px",
      border: 0,
      fontWeight: 700,
      fontSize: 14,
      cursor: "pointer",
      background: "#ef4444",
      color: "#fff",
    },
    bottomInput: {
      flex: 1,
      border: "1px solid #e5e7eb",
      borderRadius: 999,
      padding: "10px 14px",
      outline: "none",
      fontSize: 14,
    },
    bottomSend: {
      border: 0,
      borderRadius: 999,
      padding: "0 16px",
      background: "#4f46e5",
      color: "#fff",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 14,
    },
    loginHint: {
      padding: 10,
      fontSize: 13,
      color: "#64748b",
    },

    // 🔹 라이트박스
    lightboxOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.85)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      padding: 16,
      boxSizing: "border-box",
    },
    lightboxImgWrap: {
      position: "relative",
      maxWidth: "100%",
      maxHeight: "85vh",
    },
    lightboxImg: {
      maxWidth: "100%",
      maxHeight: "85vh",
      objectFit: "contain",
      display: "block",
      borderRadius: 16,
      background: "#020617",
    },
    // ✅ 닫기 버튼: 화면 오른쪽 위 고정
    lightboxClose: {
      position: "fixed",
      top: 16,
      right: 16,
      width: 32,
      height: 32,
      borderRadius: "999px",
      border: "none",
      background: "rgba(15,23,42,0.9)",
      color: "#e5e7eb",
      cursor: "pointer",
      fontSize: 18,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 101,
    },
    // ✅ 이전/다음 버튼: 화면 양옆 가운데 고정
    lightboxNavBtn: (pos) => ({
      position: "fixed",
      top: "50%",
      transform: "translateY(-50%)",
      [pos]: 16,
      width: 32,
      height: 32,
      borderRadius: "999px",
      border: "none",
      background: "rgba(15,23,42,0.9)",
      color: "#e5e7eb",
      cursor: "pointer",
      fontSize: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 101,
    }),
  };

  const avatarUrl = (() => {
    const val =
      data?.authorProfileImageUrl || data?.profileImageUrl || data?.avatarUrl;
    if (!val) return null;
    return /^https?:\/\//i.test(val) ? val : API_BASE + val;
  })();

  return (
    <div style={styles.frame}>
      {/* 스크롤바 숨김 */}
      <style>
        {`
          .td-scroll::-webkit-scrollbar {
            display: none;
          }
          .td-scroll {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>

      <div style={styles.card}>
        {/* 상단 바 */}
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

          <div style={styles.topTitle}>상세정보</div>

          {me && (
            <button
              type="button"
              onClick={toggleFavorite}
              style={styles.topStarBtn}
              aria-label={favorited ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            >
              <StarIcon filled={favorited} />
            </button>
          )}
        </div>

        {/* 스크롤 영역 */}
        <div style={styles.scroll} className="td-scroll">
          {!data ? (
            <div style={{ padding: 20 }}>불러오는 중...</div>
          ) : (
            <>
              {/* 🔹 포트폴리오 이미지 슬라이드 */}
              {hasImages ? (
                <div
                  style={styles.heroWrap}
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    src={currentImageUrl}
                    alt="portfolio"
                    style={styles.hero}
                  />
                  {portfolioUrls.length > 1 && (
                    <>
                      <button
                        type="button"
                        style={styles.heroNavBtn("left")}
                        onClick={(e) => {
                          e.stopPropagation();
                          prevImage(e);
                        }}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        style={styles.heroNavBtn("right")}
                        onClick={(e) => {
                          e.stopPropagation();
                          nextImage(e);
                        }}
                      >
                        ›
                      </button>
                      <div style={styles.heroPager}>
                        {portfolioUrls.map((_, i) => (
                          <div
                            key={i}
                            style={styles.heroDot(i === imgIndex)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div style={styles.heroEmpty}>포트폴리오 이미지가 없습니다.</div>
              )}

              {/* 프로필/이름 클릭 시 UserProfile 이동 */}
              <div
                style={{
                  ...styles.profileRow,
                  cursor: data?.authorUserId ? "pointer" : "default",
                }}
                role="button"
                tabIndex={0}
                onClick={goAuthorProfile}
                onKeyDown={(e) => e.key === "Enter" && goAuthorProfile()}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" style={styles.avatar} />
                ) : (
                  <div style={styles.avatar} />
                )}
                <div>
                  <div style={styles.name}>{data.authorName}</div>
                  <div style={styles.major}>
                    {data.authorMajor || "전공 미입력"}
                  </div>
                  <div style={styles.ratingRow}>
                    <span style={styles.ratingStar}>★</span>
                    <span>{avgScore}</span>
                    <span style={{ color: "#6b7280" }}>
                      {reviewCount > 0
                        ? ` (${reviewCount}개 후기)`
                        : " (후기 없음)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 제목 + 내용 */}
              <div style={styles.title}>{data.title}</div>
              <div style={styles.content}>{data.content}</div>

              {/* 태그 */}
              <div style={styles.tagRow}>
                {(data.tagNames || []).map((t, i) => (
                  <span key={i} style={styles.chip}>
                    {t?.startsWith("#") ? t : `#${t}`}
                  </span>
                ))}
              </div>

              {/* 참고사항 */}
              {data.extraNote && (
                <div style={styles.extraNote}>
                  <strong>참고사항</strong>
                  <br />
                  {data.extraNote}
                </div>
              )}

              {/* 후기 섹션 */}
              <div style={styles.reviewHeaderTitle}>
                후기 {reviewCount > 0 ? `(${reviewCount})` : ""}
              </div>

              {reviews.length === 0 && (
                <div style={styles.reviewEmpty}>
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
                const dateLabel = createdAt ? createdAt.slice(0, 10) : "";

                return (
                  <div key={item.id} style={styles.reviewCard}>
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
                  </div>
                );
              })}
            </>
          )}

          {!me && (
            <div style={styles.loginHint}>
              채팅을 사용하려면 먼저 로그인해주세요.
            </div>
          )}
        </div>

        {/* 하단 바 */}
        {me && !isMyPost && (
          <div style={styles.bottomWrap}>
            <div style={styles.bottomInner}>
              <input
                style={styles.bottomInput}
                placeholder="안녕하세요, 궁금하신 점 문의드려요."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goChatWithDraft()}
                disabled={creating}
              />
              <button
                style={styles.bottomSend}
                onClick={goChatWithDraft}
                disabled={creating}
              >
                {creating ? "이동 중…" : "보내기"}
              </button>
            </div>
          </div>
        )}

        {me && isMyPost && (
          <div style={styles.bottomWrap}>
            <div style={styles.bottomInner}>
              <button
                style={styles.deleteBtn}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "삭제 중…" : "삭제하기"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🔹 라이트박스 (이미지 크게 보기) */}
      {lightboxOpen && hasImages && (
        <div
          style={styles.lightboxOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          <div style={styles.lightboxImgWrap}>
            <img
              src={currentImageUrl}
              alt={`portfolio-large-${imgIndex}`}
              style={styles.lightboxImg}
            />
          </div>

          {/* 고정된 닫기 버튼 */}
          <button
            type="button"
            style={styles.lightboxClose}
            onClick={() => setLightboxOpen(false)}
          >
            ✕
          </button>

          {/* 고정된 이전/다음 버튼 */}
          {portfolioUrls.length > 1 && (
            <>
              <button
                type="button"
                style={styles.lightboxNavBtn("left")}
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage(e);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                style={styles.lightboxNavBtn("right")}
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage(e);
                }}
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
