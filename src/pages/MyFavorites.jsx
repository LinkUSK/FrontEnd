// src/pages/MyFavorites.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/mypage/myFavorites.css";
import BottomNav from "../components/BottomNav";

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

/* ============ 공통 API 유틸 (Home / My 와 동일한 패턴) ============ */
function authHeaders() {
  const t = localStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiGet(path, params = {}) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.append(k, v);
    }
  });

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

// 절대 URL 변환
function toAbs(url) {
  if (!url) return "";
  return /^https?:\/\//i.test(url)
    ? url
    : `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

export default function MyFavorites() {
  const nav = useNavigate();
  const loc = useLocation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 즐겨찾기 목록 불러오기
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await apiGet("/api/talents/favorites", {
          page: 0,
          size: 50,
          sort: "id,desc",
        });
        const content = Array.isArray(data?.content) ? data.content : data;
        setItems(Array.isArray(content) ? content : []);
      } catch (e) {
        setErr(e.message || "즐겨찾기 목록을 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function FavoriteCard({ item }) {
    const avatar = toAbs(item.authorProfileImageUrl);
    const name = item.authorName ?? item.authorUserId ?? "익명";
    const major = item.authorMajor || "전공 미입력";
    const tagNames = Array.isArray(item.tagNames)
      ? item.tagNames
      : item.tagName
      ? [item.tagName]
      : [];

    return (
      <div
        className="myfav-card"
        onClick={() => nav(`/talent/${item.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") nav(`/talent/${item.id}`);
        }}
      >
        {/* 첫 줄: 프로필 + 이름/전공 + 즐겨찾기 아이콘 */}
        <div className="myfav-top-row">
          <div className="myfav-avatar-small">
            {avatar ? (
              <img
                src={avatar}
                alt="avatar"
                className="myfav-avatar-img-small"
              />
            ) : null}
          </div>
          <div className="myfav-name-wrap">
            <div className="myfav-name-line">
              <strong>{name}</strong> {` · ${major}`}
            </div>
          </div>
          <div className="myfav-fav-icon-wrap">★</div>
        </div>

        {/* 제목 */}
        <div className="myfav-title">{item.title}</div>

        {/* 태그들 */}
        <div className="myfav-chip-row">
          {tagNames.map((t, idx) => (
            <span
              key={`${item.id}-${t}-${idx}`}
              className="myfav-chip"
            >
              {t?.startsWith("#") ? t : `#${t}`}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="myfav-frame">
      <div className="myfav-wrap">
        {/* 상단 바 */}
        <div className="myfav-top-bar">
          <button
            type="button"
            className="myfav-back-btn"
            onClick={() => nav(-1)} // 또는 nav("/my")
          >
            ←
          </button>
          <div className="myfav-top-title">즐겨찾기 목록</div>
        </div>

        {/* 내용 영역 */}
        <div className="inner-scroll myfav-inner">
          {loading && (
            <div className="myfav-small-muted">불러오는 중…</div>
          )}
          {err && (
            <div className="myfav-small-muted myfav-small-muted-error">
              {err}
            </div>
          )}
          {!loading && !err && items.length === 0 && (
            <div className="myfav-small-muted">
              즐겨찾기한 재능글이 아직 없습니다.
            </div>
          )}
          {items.map((it) => (
            <FavoriteCard key={it.id} item={it} />
          ))}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}