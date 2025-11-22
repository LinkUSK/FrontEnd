// src/pages/Home.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import "../styles/home.css";
import linkuLogoTitle from "/images/LinkU_Title.png";
import searchIcon from "/images/search-icon.png";

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

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

  // ✅ 인기 태그 = AI 추천 tags로 대체
  const [popularTags, setPopularTags] = useState([]);
  const [popularLoading, setPopularLoading] = useState(false);

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
        const meData = await apiGet("/api/me");
        setMe(meData);
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

  /* ================== ✅ 인기 태그(AI tags) 가져오기 ================== */

  const FALLBACK_TAGS = [
  "웹 개발",
  "디자인",
  "영상 편집",
  "사진 촬영",
  "프론트엔드",
  "백엔드",
  "취업 포트폴리오",
  "팀프로젝트",
];

async function fetchPopularTags() {
  try {
    setPopularLoading(true);

    const params = { q: " " };
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

    if (cleaned.length > 0) {
      setPopularTags(cleaned);
    } else {
      setPopularTags(FALLBACK_TAGS);
    }

  } catch (e) {
    console.error("popular tags(ai) error", e);
    setPopularTags(FALLBACK_TAGS);
  } finally {
    setPopularLoading(false);
  }
}

  // me(전공) 로드되면 인기 태그 재로딩
  useEffect(() => {
    fetchPopularTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.major]);

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
        className="home-card"
      >
        <div className="home-cardTopRow">
          <div
            className="home-avatar"
            role="button"
            tabIndex={0}
            onClick={goProfile}
            onKeyDown={(e) => e.key === "Enter" && goProfile(e)}
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" className="home-avatarImg" />
            ) : (
              <div className="home-avatarInitial" />
            )}
          </div>

          <div className="home-nameCol">
            <div className="home-nameRow">
              <div
                className="home-nameLeft"
                role="button"
                tabIndex={0}
                onClick={goProfile}
                onKeyDown={(e) => e.key === "Enter" && goProfile(e)}
              >
                <strong>
                  {item.authorName ?? item.authorUserId ?? "익명"}
                </strong>
                <span className="home-majorText">
                  {item.authorMajor || "전공 미입력"}
                </span>
              </div>

              {rating != null && (
                <div className="home-ratingRow">
                  <span className="home-ratingStar">★</span>
                  <span className="home-ratingValue">{rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="home-cardTitle">{item.title}</div>

        <div className="home-chipRow">
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
              className="home-chip"
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
    <div className="home-frame">
      <div className="home-wrap">
        <div className="inner-scroll home-inner">
          <div className="home-top">
            <img src={linkuLogoTitle} className="home-logo" alt="logo" />
          </div>

          {/* 🔍 기본 검색창 */}
          <div className="home-search">
            <img src={searchIcon} className="home-searchIcon" alt="search" />
            <input
              className="home-searchInput"
              placeholder="재능, 전공, 키워드, #태그 검색"
              value={qDisplay}
              onChange={(e) => setQDisplay(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />
          </div>

          {/* 🔥 인기 태그 = AI 추천 tags */}
          {popularTags.length > 0 && (
            <div>
              <div className="home-sectionTitle">인기 태그</div>
              <div className="horizontal-scroll home-horizontalScroll">
                {popularTags.map((name, idx) => (
                  <span
                    key={`popular-${name}-${idx}`}
                    className="home-popularChip"
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

          {popularLoading && (
            <div className="home-loading">인기 태그 불러오는 중...</div>
          )}

          {/* 기존 tagId 필터 해제 버튼 */}
          {tagFilterId && (
            <div className="home-tagClearWrap">
              <button
                onClick={() => setTagFilterId(null)}
                className="home-tagClearBtn"
              >
                태그 필터 해제 ✕
              </button>
            </div>
          )}

          {/* 게시글 리스트 + 무한스크롤 */}
          <div className="home-list">
            {posts.map((p, i) => (
              <div
                key={p.id}
                className="home-postWrapper"
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

          {loading && <div className="home-loading">불러오는 중...</div>}
        </div>

        <BottomNav active="home" />
      </div>
    </div>
  );
}