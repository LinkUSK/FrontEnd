// src/pages/Chat.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import "../styles/chat/chat.css"; 

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

/* ============ API 유틸 ============ */
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
/* ================================= */

export default function Chat() {
  const nav = useNavigate();
  const loc = useLocation();

  const [me, setMe] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = useMemo(() => localStorage.getItem(TOKEN_KEY) || "", []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 내 정보
        try {
          const meRes = await apiGet("/api/me");
          if (alive) setMe(meRes);
        } catch {
          if (alive) setMe(null);
        }

        // 내 채팅방 목록
        const list = await apiGet("/api/chat/my-rooms");
        const arr = Array.isArray(list) ? list : [];

        if (alive) setRooms(arr);
      } catch (e) {
        console.error(e);
        alert("채팅 목록을 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, loc.key]); // 목록 페이지로 돌아왔을 때 자연 새로고침

  function fmt(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    const hh = d.getHours().toString().padStart(2, "0");
    const mi = d.getMinutes().toString().padStart(2, "0");
    return `${mm}/${dd} ${hh}:${mi}`;
  }

  return (
    <div className="chat-wrap">
      <div className="chat-top">
        <div className="chat-title">채팅</div>
      </div>

      {loading ? (
        <div className="chat-empty">불러오는 중…</div>
      ) : rooms.length === 0 ? (
        <div className="chat-empty">
          채팅방이 없습니다. 게시글에서 채팅을 시작해보세요.
        </div>
      ) : (
        <div className="chat-list">
          {rooms.map((r) => {
            const other = r.otherUser || {};
            const avatarUrl = other.avatar
              ? /^https?:\/\//i.test(other.avatar)
                ? other.avatar
                : API_BASE + other.avatar
              : null;

            const unread = r.unread || 0;
            const unreadLabel = unread > 99 ? "99+" : unread;

            return (
              <div
                key={r.roomId}
                className="chat-item"
                onClick={() => nav(`/chat/${r.roomId}`)}
              >
                {/* 프로필 + 겹쳐진 뱃지 */}
                <div className="chat-avatar-wrap">
                  {avatarUrl ? (
                    <img alt="avatar" src={avatarUrl} className="chat-avatar" />
                  ) : (
                    <div className="chat-avatar" />
                  )}
                  {unread > 0 && (
                    <div className="chat-avatar-badge">{unreadLabel}</div>
                  )}
                </div>

                <div className="chat-main">
                  <div className="chat-name">
                    {other.name || other.userId || "사용자"}{" "}
                    {other.major ? ` · ${other.major}` : ""}
                  </div>
                  <div className="chat-last">
                    {r.lastMessage?.content || "대화를 시작해보세요."}
                  </div>
                </div>

                <div className="chat-meta">
                  <div className="chat-time">
                    {fmt(r.lastMessage?.createdAt)}
                  </div>
                  {/* 오른쪽 큰 뱃지 쓰고 싶으면 아래 주석 풀고 사용
                  {unread > 0 && (
                    <div className="chat-badge">{unreadLabel}</div>
                  )}
                  */}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
}