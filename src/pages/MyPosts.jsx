// src/pages/MyPosts.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/mypage/myPosts.css";
import BottomNav from "../components/BottomNav";
import backIcon from "/images/back-icon.png";

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

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

function toAbs(url) {
  if (!url) return "";
  return /^https?:\/\//i.test(url)
    ? url
    : `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

export default function MyPosts() {
  const nav = useNavigate();
  const loc = useLocation();

  const [me, setMe] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const meData = await apiGet("/api/me");
        setMe(meData);
        if (!meData?.userId) {
          setList([]);
        } else {
          const qs = `/api/talents?author=${encodeURIComponent(
            meData.userId
          )}&page=0&size=20&sort=createdAt,desc`;
          const data = await apiGet(qs);
          const content = Array.isArray(data?.content) ? data.content : data;
          setList(Array.isArray(content) ? content : []);
        }
      } catch (e) {
        setErr(e.message || "내 게시글을 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function MyPostCard({ item }) {
    const tagNames = Array.isArray(item.tagNames)
      ? item.tagNames
      : item.tagName
      ? [item.tagName]
      : [];
    const avatar = toAbs(
      item.authorProfileImageUrl || item.profileImageUrl || item.avatarUrl
    );

    return (
      <div
        className="myposts-card"
        onClick={() => nav(`/talent/${item.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") nav(`/talent/${item.id}`);
        }}
      >
        <div className="myposts-card-top-row">
          <div className="myposts-avatar-small">
            {avatar ? (
              <img
                src={avatar}
                alt="avatar"
                className="myposts-avatar-img-small"
              />
            ) : null}
          </div>
          <div className="myposts-card-top-text">
            <div className="myposts-name-line">
              <strong>{item.authorName ?? item.authorUserId ?? "익명"}</strong>
              {` · ${item.authorMajor || "전공 미입력"}`}
            </div>
          </div>
        </div>

        <div className="myposts-title">{item.title}</div>

        <div className="myposts-chip-row">
          {tagNames.map((t, idx) => (
            <span key={`${item.id}-${t}-${idx}`} className="myposts-chip">
              {t?.startsWith("#") ? t : `#${t}`}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="myposts-frame">
      <div className="myposts-wrap">
        {/* 상단 뒤로가기 바 */}
        <div className="myposts-top-bar">
          <img
            src={backIcon}
            alt="back"
            className="myposts-back-btn"
            onClick={() => nav(-1)} // 또는 nav("/my")
          />
          <div className="myposts-top-title">내 게시물</div>
        </div>

        <div className="inner-scroll myposts-inner">
          <div className="myposts-section-title">내가 올린 재능글</div>

          {loading && (
            <div className="myposts-small-muted myposts-small-muted-margin">
              불러오는 중…
            </div>
          )}

          {err && <div className="myposts-error-text">{err}</div>}

          {!loading && !err && list.length === 0 && (
            <div className="myposts-small-muted">
              등록한 게시글이 없습니다.
            </div>
          )}

          {list.map((p) => (
            <MyPostCard key={p.id} item={p} />
          ))}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}