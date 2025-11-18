// src/pages/Home.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

// 🔹 홈 화면에서 쓸 "인기 태그" 목록 (원하는 걸로 수정해서 사용)
const POPULAR_TAGS = [
  "웹 개발",
  "디자인",
  "영상 편집",
  "사진 촬영",
  "프론트엔드",
  "백엔드",
  "취업 포트폴리오",
  "팀프로젝트",
];

// 🔹 공통 스타일 주입 (세로/가로 스크롤바 숨김)
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

    /* ✅ 가로 스크롤 컨테이너의 스크롤바 숨김 */
    .horizontal-scroll {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .horizontal-scroll::-webkit-scrollbar {
      display: none;
    }
  `;
  document.head.appendChild(s);
})();

export default function Home() {
  const nav = useNavigate();
  const loc = useLocation();

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  // 🔍 검색창에 보이는 텍스트
  const [qDisplay, setQDisplay] = useState("");
  // 🔍 실제 API에 쓰는 검색어 (# 제거한 버전)
  const [q, setQ] = useState("");

  const [tagFilterId, setTagFilterId] = useState(null);
  const [me, setMe] = useState(null);
  const observer = useRef(null);

  // ✨ AI 추천 검색: tags만 사용
  const [aiTags, setAiTags] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  function authHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function apiGet(path, params = {}) {
    const url = new URL(API_BASE + path);
    Object.entries(params).forEach(
      ([k, v]) => (v ?? "") !== "" && url.searchParams.set(k, v)
    );
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

  /* ================== 초기 로딩 ================== */

  useEffect(() => {
    (async () => {
      try {
        setMe(await apiGet("/api/me"));
      } catch {
        // 비로그인일 수도 있음
      }
    })();
    fetchPosts(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchPosts(0);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagFilterId]);

  useEffect(() => {
    if (page > 0) fetchPosts(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /* ================== 게시글 목록 조회 ================== */

  async function fetchPosts(nextPage = 0, custom = {}) {
    setLoading(true);
    try {
      const data = await apiGet("/api/talents", {
        page: nextPage,
        size: 5,
        q,
        tagId: tagFilterId,
        ...custom,
      });
      const content = data?.content || [];
      const merged = (nextPage === 0 ? content : [...posts, ...content]).map(
        (p) => {
          if (me && p.authorUserId === me.userId) {
            return {
              ...p,
              authorMajor: me.major,
              authorProfileImageUrl: me.profileImageUrl,
            };
          }
          return p;
        }
      );
      setPosts(merged);
      setTotalPages(data.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }

  function toAbs(url) {
    if (!url) return "";
    return /^https?:\/\//i.test(url)
      ? url
      : `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
  }

  /* ================== 스타일 ================== */

  const styles = {
    frame: {
      background: "#eef2f7",
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
    },
    wrap: {
      maxWidth: 420,
      width: "100%",
      height: "100vh",
      maxHeight: 720,
      background: "#f8fafc",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      paddingBottom: 6,
    },
    inner: {
      flex: 1,
      overflowY: "auto",
      padding: "0 16px 12px",
      boxSizing: "border-box",
    },
    top: {
      fontWeight: 800,
      fontSize: 22,
      padding: "18px 2px 10px",
      textAlign: "center",
    },
    search: {
      display: "flex",
      alignItems: "center",
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      padding: "10px 14px",
      width: "100%",
      boxSizing: "border-box",
    },
    input: {
      border: "none",
      outline: "none",
      flex: 1,
      fontSize: 14,
      color: "#334155",
      background: "transparent",
    },
    list: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      marginTop: 10,
      width: "100%",
      boxSizing: "border-box",
    },
    sectionTitle: {
      marginTop: 14,
      marginBottom: 6,
      fontSize: 13,
      fontWeight: 600,
      color: "#64748b",
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
    card: {
      width: "100%",
      boxSizing: "border-box",
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: 14,
      cursor: "pointer",
    },
    topRow: { display: "flex", alignItems: "center", gap: 10 },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: "50%",
      background: "#e5e7eb",
      overflow: "hidden",
      flex: "0 0 44px",
      cursor: "pointer",
    },
    avatarImg: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
    nameRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    nameLeft: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: 13,
      color: "#0f172a",
      minWidth: 0,
      cursor: "pointer",
    },
    majorText: {
      fontSize: 12,
      color: "#9ca3af",
      whiteSpace: "nowrap",
    },
    title: { marginTop: 6, fontSize: 15, fontWeight: 700, color: "#0f172a" },
    chipRow: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginTop: 6,
    },
    chip: {
      fontSize: 11,
      padding: "6px 10px",
      borderRadius: 999,
      background: "#fff",
      border: "1px solid #e5e7eb",
      color: "#4b5563",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    ratingRow: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      fontSize: 12,
      color: "#4b5563",
      whiteSpace: "nowrap",
    },
    ratingStar: { fontSize: 16 },
    aiButton: {
      width: "100%",
      marginTop: 10,
      borderRadius: 999,
      border: "1px solid rgba(129,140,248,0.6)",
      padding: "9px 0",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      background: "#ffffff",
      color: "#1e293b",
      boxShadow: "0 6px 14px rgba(15,23,42,0.04)",
    },
    aiIcon: {
      width: 24,
      height: 24,
      borderRadius: "999px",
      background:
        "radial-gradient(circle at 30% 30%, #4f46e5, #0ea5e9, #22c55e)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontSize: 13,
      fontWeight: 800,
      boxShadow: "0 0 0 2px rgba(191,219,254,0.9)",
    },
    aiButtonSub: {
      fontSize: 11,
      fontWeight: 500,
      color: "#64748b",
    },
    // 🔹 가로 스크롤 영역 공통
    //    → 스크롤바는 아래쪽으로 밀어내서 안 보이게 처리
    horizontalScroll: {
      display: "flex",
      gap: 8,
      overflowX: "auto",      // 가로 스크롤 가능
      overflowY: "hidden",
      flexWrap: "nowrap",
      paddingBottom: 12,      // 컨테이너 안쪽에 여백
      marginBottom: -8,       // 스크롤바가 이 여백 아래로 내려가서 안 보이게 됨
      WebkitOverflowScrolling: "touch",
    },
    // 🔵 AI 추천 검색어용 칩
    blueChip: {
      fontSize: 11,
      padding: "7px 12px",
      borderRadius: 999,
      background: "#ffffff",
      border: "1px solid #bfdbfe",
      color: "#1d4ed8",
      display: "inline-flex",
      alignItems: "center",
      cursor: "pointer",
      whiteSpace: "nowrap",
      flex: "0 0 auto",
      boxShadow: "0 2px 6px rgba(148,163,184,0.18)",
    },
    // ⭐ 인기 태그용: 무난한 회색 칩
    popularChip: {
      fontSize: 11,
      padding: "6px 10px",
      borderRadius: 999,
      background: "#f9fafb",
      border: "1px solid #e5e7eb",
      color: "#4b5563",
      display: "inline-flex",
      alignItems: "center",
      cursor: "pointer",
      whiteSpace: "nowrap",
      flex: "0 0 auto",
    },
  };

  /* ================== 하단 탭 ================== */

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

  /* ================== 공통 검색 실행 함수 ================== */

  const runSearchWithKeyword = (keyword, { showInInput = true } = {}) => {
    const raw = (keyword || "").trim();
    const effective = raw.startsWith("#") ? raw.slice(1).trim() : raw;

    if (showInInput) setQDisplay(raw);
    setQ(effective);

    setTagFilterId(null);
    setPage(0);
    fetchPosts(0, { q: effective });
  };

  /* ================== AI 추천 검색 ================== */

  async function fetchAiSuggest() {
    try {
      setAiLoading(true);
      const raw = (qDisplay || "").trim();
      const effective = raw.startsWith("#") ? raw.slice(1).trim() : raw;

      const params = {
        q: effective || " ",
      };
      if (me?.major) params.major = me.major;

      const data = await apiGet("/api/ai/search-suggest", params);
      const tags = Array.isArray(data?.tags) ? data.tags : [];
      const cleaned = Array.from(
        new Set(
          tags
            .map((t) => (t ?? "").toString().trim())
            .filter((t) => t.length > 0)
        )
      );
      setAiTags(cleaned);
    } catch (e) {
      console.error("ai search suggest error", e);
    } finally {
      setAiLoading(false);
    }
  }

  const handleAiClick = async () => {
    if (!aiOpen) setAiOpen(true);
    await fetchAiSuggest();
  };

  /* ================== 게시글 카드 ================== */

  function PostCard({ item }) {
    const [rating, setRating] = useState(null);

    const tagNames = Array.isArray(item.tagNames)
      ? item.tagNames
      : item.tagName
      ? [item.tagName]
      : [];
    const tagIds = Array.isArray(item.tagIds)
      ? item.tagIds
      : item.tagId
      ? [item.tagId]
      : [];
    const avatarSrc = toAbs(
      item.authorProfileImageUrl || item.profileImageUrl || item.avatarUrl
    );

    const loginId = item.authorUserId;

    const goProfile = (e) => {
      e.stopPropagation();
      const authorLoginId =
        loginId ||
        item.authorUserId ||
        item.authorLoginId ||
        (item.author && item.author.userId);
      if (!authorLoginId) return;
      nav(`/profile/${encodeURIComponent(authorLoginId)}`);
    };

    useEffect(() => {
      if (!loginId) {
        setRating(null);
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          const data = await apiGet(
            `/api/chat/linku/rating/user-id/${encodeURIComponent(loginId)}`
          );
          if (cancelled) return;
          const avg =
            typeof data.averageScore === "number"
              ? data.averageScore
              : Number(data.averageScore) || 0;
          setRating(avg);
        } catch {
          if (!cancelled) setRating(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [loginId]);

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => nav(`/talent/${item.id}`)}
        onKeyDown={(e) => {
          if (e.key === "Enter") nav(`/talent/${item.id}`);
        }}
        style={styles.card}
      >
        <div style={styles.topRow}>
          <div
            style={styles.avatar}
            role="button"
            tabIndex={0}
            onClick={goProfile}
            onKeyDown={(e) => e.key === "Enter" && goProfile(e)}
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" style={styles.avatarImg} />
            ) : (
              "👤"
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.nameRow}>
              <div
                style={styles.nameLeft}
                role="button"
                tabIndex={0}
                onClick={goProfile}
                onKeyDown={(e) => e.key === "Enter" && goProfile(e)}
              >
                <strong>{item.authorName ?? item.authorUserId ?? "익명"}</strong>
                <span style={styles.majorText}>
                  {item.authorMajor || "전공 미입력"}
                </span>
              </div>

              {rating != null && (
                <div style={styles.ratingRow}>
                  <span style={styles.ratingStar}>★</span>
                  <span style={{ fontWeight: 700 }}>
                    {rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={styles.title}>{item.title}</div>

        <div style={styles.chipRow}>
          {tagNames.map((t, idx) => (
            <span
              key={`${item.id}-${t}-${idx}`}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setTagFilterId(tagIds[idx]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  setTagFilterId(tagIds[idx]);
                }
              }}
              style={styles.chip}
              title="이 태그로 필터링"
            >
              {t?.startsWith("#") ? t : `#${t}`}
            </span>
          ))}
        </div>
      </div>
    );
  }

  /* ================== 일반 검색 버튼 ================== */

  const onSearch = () => {
    runSearchWithKeyword(qDisplay, { showInInput: true });
  };

  /* ================== 렌더링 ================== */

  return (
    <div style={styles.frame}>
      <div style={styles.wrap}>
        <div className="inner-scroll" style={styles.inner}>
          <div style={styles.top}>CampusLink</div>

          {/* 🔍 기본 검색창 */}
          <div style={styles.search}>
            <span style={{ marginRight: 8 }}>🔍</span>
            <input
              style={styles.input}
              placeholder="재능, 전공, 키워드, #태그 검색"
              value={qDisplay}
              onChange={(e) => setQDisplay(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />
            <button
              onClick={onSearch}
              style={{
                border: 0,
                borderRadius: 12,
                padding: "8px 10px",
                background: "#4f46e5",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              검색
            </button>
          </div>

          {/* ✨ AI 추천 검색 버튼 */}
          <button style={styles.aiButton} onClick={handleAiClick}>
            <div style={styles.aiIcon}>AI</div>
            <div>
              <div>AI 추천 검색</div>
              <div style={styles.aiButtonSub}>
                내 전공과 키워드로 팀원을 추천해줘요
              </div>
            </div>
            {aiLoading && (
              <span style={{ fontSize: 11, marginLeft: 6 }}>불러오는 중...</span>
            )}
          </button>

          {/* ✨ AI 추천 검색어 (tags만, 가로 스크롤 / 스크롤바 숨김) */}
          {aiOpen && aiTags.length > 0 && (
            <div>
              <div style={styles.sectionTitle}>AI 추천 검색어</div>
              <div
                className="horizontal-scroll"
                style={styles.horizontalScroll}
              >
                {aiTags.map((name, idx) => (
                  <span
                    key={`ai-tag-${idx}`}
                    style={styles.blueChip}
                    onClick={(e) => {
                      e.stopPropagation();
                      runSearchWithKeyword(name, { showInInput: true });
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 🔥 인기 태그 (가로 스크롤 / 무난한 칩) */}
          {POPULAR_TAGS.length > 0 && (
            <div>
              <div style={styles.sectionTitle}>인기 태그</div>
              <div
                className="horizontal-scroll"
                style={styles.horizontalScroll}
              >
                {POPULAR_TAGS.map((name) => (
                  <span
                    key={name}
                    style={styles.popularChip}
                    onClick={(e) => {
                      e.stopPropagation();
                      runSearchWithKeyword(`#${name}`, { showInInput: true });
                    }}
                  >
                    #{name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 기존 tagId 필터 해제 버튼 */}
          {tagFilterId && (
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => setTagFilterId(null)}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  border: "1px solid #4f46e5",
                  borderRadius: 999,
                  background: "#eef2ff",
                  color: "#3730a3",
                  cursor: "pointer",
                }}
              >
                태그 필터 해제 ✕
              </button>
            </div>
          )}

          {/* 게시글 리스트 + 무한스크롤 */}
          <div style={styles.list}>
            {posts.map((p, i) => (
              <div
                key={p.id}
                style={{ width: "100%", boxSizing: "border-box" }}
                ref={
                  i === posts.length - 1
                    ? (node) => {
                        if (loading) return;
                        if (observer.current) observer.current.disconnect();
                        observer.current = new IntersectionObserver(
                          (entries) => {
                            if (
                              entries[0].isIntersecting &&
                              page + 1 < totalPages
                            ) {
                              setPage((prev) => prev + 1);
                            }
                          }
                        );
                        if (node) observer.current.observe(node);
                      }
                    : null
                }
              >
                <PostCard item={p} />
              </div>
            ))}
          </div>

          {loading && (
            <div
              style={{
                textAlign: "center",
                color: "#94a3b8",
                padding: 20,
                fontSize: 13,
              }}
            >
              불러오는 중...
            </div>
          )}
        </div>

        <BottomBar />
      </div>
    </div>
  );
}
