// src/pages/My.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import "../styles/mypage/my.css";
import changeIcon from '/images/change-icon.png'
import articleIton from '/images/article-icon.png'
import linkuIcon from '/images/linku-icon.png'
import starIcon from '/images/star-icon.png'

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

async function apiDelete(path) {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    method: "DELETE",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }
  if (!res.ok)
    throw new Error(data.message || `DELETE ${path} failed (${res.status})`);
  return data;
}

function pickAvatarCandidate(me) {
  if (!me) return {};
  const url =
    me.profileImageUrl ||
    me.avatarUrl ||
    me.photoUrl ||
    me.imageUrl ||
    me.avatar ||
    "";
  const base64 = me.avatarBase64 || me.avatar_b64 || "";
  const fileId = me.avatarFileId || me.fileId || "";
  const path = me.avatarPath || me.imagePath || "";
  return { url, base64, fileId, path };
}

export default function My() {
  const nav = useNavigate();
  const loc = useLocation();

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // 별점 요약 상태
  const [ratingSummary, setRatingSummary] = useState({
    averageScore: null,
    reviewCount: null,
  });
  const [ratingError, setRatingError] = useState("");

  // me 불러오기
  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        nav("/login");
        return;
      }
      try {
        setLoading(true);
        const data = await apiGet("/api/me");
        setMe(data);
      } catch (e) {
        setMsg({
          type: "error",
          text: e.message || "프로필을 불러오지 못했어요.",
        });
        if (String(e).includes("401")) nav("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  const meAvatarCandidate = useMemo(() => pickAvatarCandidate(me), [me]);
  const [avatarSrc, setAvatarSrc] = useState("");

  useEffect(() => {
    const { url, base64, fileId, path } = meAvatarCandidate;
    if (base64) {
      setAvatarSrc(`data:image/*;base64,${base64}`);
      return;
    }
    if (url) {
      setAvatarSrc(url.startsWith("http") ? url : `${API_BASE}${url}`);
      return;
    }
    if (fileId) {
      setAvatarSrc(`${API_BASE}/api/files/${encodeURIComponent(fileId)}`);
      return;
    }
    if (path) {
      setAvatarSrc(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`);
      return;
    }
    setAvatarSrc("");
  }, [meAvatarCandidate]);

  // 별점 평균 / 후기 개수
  useEffect(() => {
    if (!me) return;
    (async () => {
      try {
        setRatingError("");
        const data = await apiGet("/api/chat/linku/rating/me");
        const avg =
          typeof data.averageScore === "number"
            ? data.averageScore
            : Number(data.averageScore) || 0;
        const cnt =
          typeof data.reviewCount === "number"
            ? data.reviewCount
            : Number(data.reviewCount) || 0;
        setRatingSummary({ averageScore: avg, reviewCount: cnt });
      } catch (e) {
        setRatingError(e.message || "별점 정보를 불러오지 못했어요.");
      }
    })();
  }, [me]);

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    nav("/login");
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "정말로 회원을 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      )
    )
      return;
    try {
      setMsg({ type: "", text: "" });
      await apiDelete("/api/me");
      setMsg({ type: "ok", text: "✅ 회원 탈퇴가 완료되었습니다." });
      localStorage.removeItem(TOKEN_KEY);
      setTimeout(() => nav("/login"), 700);
    } catch (e) {
      setMsg({ type: "error", text: `❌ ${e.message}` });
    }
  }

  const displayAvg =
    ratingSummary.averageScore != null
      ? ratingSummary.averageScore.toFixed(1)
      : "0.0";
  const displayCount =
    ratingSummary.reviewCount != null ? ratingSummary.reviewCount : 0;

  const msgClass =
    "mypage-msg" +
    (msg.type === "ok" ? " mypage-msg-ok" : "") +
    (msg.type === "error" ? " mypage-msg-error" : "");

  return (
    <div className="mypage-frame">
      <div className="mypage-wrap">
        <div className="mypage-top">마이페이지</div>

        <div className="inner-scroll mypage-inner">
          <div className="mypage-profile-box">
            {/* 프로필 영역 */}
            <div className="mypage-avatar-row">
              <div className="mypage-avatar" title="프로필 사진">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="mypage-avatar-img"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarSrc("")}
                  />
                ) : (
                  <div className="mypage-avatar-initial"/>
                )}
              </div>

              <div className="mypage-profile-main">
                <div className="mypage-name">
                  {loading ? "불러오는 중…" : me?.username || "이름 없음"}
                </div>
                <div className="mypage-sub">{me?.major || "전공 미입력"}</div>
                <div className="mypage-stars-row">
                  <span className="mypage-star">★</span>
                  <span className="mypage-star-score">{displayAvg}</span>
                  <span className="mypage-small-muted">
                    후기 {displayCount}개
                  </span>
                </div>
                {ratingError && (
                  <div className="mypage-rating-error">
                    {ratingError}
                  </div>
                )}
              </div>

              {/* 로그아웃 + 회원 탈퇴 */}
              <div className="mypage-auth-buttons">
                <button onClick={logout} className="mypage-btn-primary">
                  로그아웃
                </button>
              </div>
            </div>

            {/* ✅ 프로필 수정 페이지로 이동 */}
            <div className="mypage-edit-profile-wrap">
              <button
                className="mypage-edit-profile-btn"
                onClick={() => nav("/my/edit")}
              >
                <img src={changeIcon} alt="change" className="mypage-edit-icon"/>
                <span>프로필 수정</span>
              </button>
            </div>

            <div className={msgClass}>{msg.text}</div>

            {/* 메뉴 리스트 */}
            <div className="mypage-menu-list">
              <button
                type="button"
                className="mypage-menu-item"
                onClick={() => nav("/my/reviews")}
              >
                <div className="mypage-menu-left">
                  <img src={changeIcon} className="mypage-menu-icon"/>
                  <span>받은 후기</span>
                </div>
                <span className="mypage-menu-arrow">›</span>
              </button>

              <button
                type="button"
                className="mypage-menu-item"
                onClick={() => nav("/my/posts")}
              >
                <div className="mypage-menu-left">
                  <img src={articleIton} className="mypage-menu-icon" />
                  <span>내 게시물</span>
                </div>
                <span className="mypage-menu-arrow">›</span>
              </button>

              <button
                type="button"
                className="mypage-menu-item"
                onClick={() => nav("/my/links")}
              >
                <div className="mypage-menu-left">
                  <img src={linkuIcon} className="mypage-menu-icon"/>
                  <span>내 링크유</span>
                </div>
                <span className="mypage-menu-arrow">›</span>
              </button>

              <button
                type="button"
                className="mypage-menu-item"
                onClick={() => nav("/my/favorites")}
              >
                <div className="mypage-menu-left">
                  <img src={starIcon} className="mypage-menu-icon"/>
                  <span>즐겨찾기 목록</span>
                </div>
                <span className="mypage-menu-arrow">›</span>
              </button>
            </div>
          </div>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}