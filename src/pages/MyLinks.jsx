// src/pages/MyLinks.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/mypage/myLinks.css";
import BottomNav from "../components/BottomNav";
import backIcon from "/images/back-icon.png";

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders() {
  const t = getToken();
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

// 프로필 이미지 url 보정
function resolveImgUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

// 이름에서 한 글자 이니셜
function initialOf(name) {
  if (!name) return "?";
  const t = name.trim();
  return t ? t[0] : "?";
}

export default function MyLinks() {
  const nav = useNavigate();
  const loc = useLocation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 데이터 불러오기
  useEffect(() => {
    (async () => {
      const t = getToken();
      if (!t) {
        nav("/login");
        return;
      }
      try {
        setLoading(true);
        setErr("");
        const data = await apiGet("/api/chat/linku/connections/me");
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e.message || "링크유 기록을 불러오지 못했어요.");
        if (String(e).includes("401")) {
          nav("/login");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  function renderAvatarCircle(src, name, extraClass) {
    const url = resolveImgUrl(src);
    return (
      <div className={`mylinks-avatar-circle-base ${extraClass}`}>
        {url ? (
          <img
            src={url}
            alt={name || "profile"}
            className="mylinks-avatar-img"
            onError={(e) => {
              // 이미지 깨지면 이니셜로 대체
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement.textContent = initialOf(name);
            }}
          />
        ) : (
          initialOf(name)
        )}
      </div>
    );
  }

  function LinkCard({ item }) {
    const title = `${item.partnerName || "상대"}님과의 링크유`;
    const sub = item.talentTitle || "";
    const period =
      item.period ||
      (item.startDate && item.endDate
        ? `${item.startDate} ~ ${item.endDate}`
        : item.startDate || "");

    return (
      <div
        className="mylinks-card"
        onClick={() => item.roomId && nav(`/chat/${item.roomId}`)}
      >
        {/* 겹치는 프로필 사진 */}
        <div className="mylinks-avatar-stack">
          {/* 뒤쪽 : 상대방 */}
          {renderAvatarCircle(
            item.partnerProfileImageUrl,
            item.partnerName,
            "mylinks-avatar-back"
          )}
          {/* 앞쪽 : 제안자 */}
          {renderAvatarCircle(
            item.proposerProfileImageUrl,
            item.proposerName,
            "mylinks-avatar-front"
          )}
        </div>

        {/* 텍스트 영역 */}
        <div className="mylinks-card-text-wrap">
          <div className="mylinks-card-title">{title}</div>
          {sub && <div className="mylinks-card-sub">{sub}</div>}
          {period && <div className="mylinks-card-date">{period}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="mylinks-frame">
      <div className="mylinks-wrap">
        {/* 상단 바 */}
        <div className="mylinks-top-bar">
          <img
            src={backIcon}
            alt="back"
            className="mylinks-back-btn"
            onClick={() => nav(-1)}
          />
          <div className="mylinks-top-title">내 링크유</div>
        </div>

        {/* 내용 영역 (스크롤) */}
        <div className="inner-scroll mylinks-inner">
          {loading && (
            <div className="mylinks-small-muted">불러오는 중…</div>
          )}
          {err && (
            <div className="mylinks-small-muted mylinks-small-muted-error">
              {err}
            </div>
          )}
          {!loading && !err && items.length === 0 && (
            <div className="mylinks-small-muted">
              아직 링크유 기록이 없습니다.
            </div>
          )}
          {items.map((it) => (
            <LinkCard key={it.connectionId} item={it} />
          ))}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}