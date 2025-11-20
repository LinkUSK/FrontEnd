// src/pages/ChatReview.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import "../styles/chat/chatReview.css";
import backIcon from '/images/back-icon.png'
import goodIcon from '/images/good-icon.png'
import badIcon from '/images/bad-icon.png'
import sosoIcon from '/images/soso-icon.png'
import fullStar from '/images/full-star.png'
import emptyStar from '/images/empty-star.png'

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

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

export default function ChatReview() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const otherUser = loc.state?.otherUser || null;

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const [relationRating, setRelationRating] = useState("BEST");
  const [kindnessScore, setKindnessScore] = useState(5);
  const [text, setText] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const meRes = await apiGet("/api/me");
        if (!alive) return;
        setMe(meRes);
      } catch {
        alert("로그인이 필요합니다.");
        nav("/login");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [nav]);

  const myName = me?.name || me?.nickname || me?.userId || "회원";
  const otherName =
    otherUser?.name || otherUser?.nickname || otherUser?.userId || "상대";

  async function handleSubmit() {
    if (kindnessScore < 1 || kindnessScore > 5) {
      alert("별점을 선택해주세요.");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/api/chat/rooms/${roomId}/linku/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          credentials: "include",
          body: JSON.stringify({
            relationRating,
            kindnessScore,
            content: text.trim() || null,
          }),
        }
      );
      const raw = await res.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw };
      }
      if (!res.ok) throw new Error(data.message || "후기 전송 실패");

      alert("후기를 남겼습니다. 감사합니다!");

      // ✅ 올바른 채팅방 경로로 돌아가기
      nav(`/chat/${roomId}`);
    } catch (e) {
      console.error(e);
      alert(e.message || "후기 전송에 실패했습니다.");
    }
  }

  return (
    <div className="chatreview-stage">
      <div className="chatreview-card">
        {/* 상단바 */}
        <div className="chatreview-top">
          <img
            src={backIcon}
            alt="뒤로가기"
            onClick={() => nav(-1)}
            className="chatreview-back-btn"
          />
          <div className="chatreview-top-title">후기 남기기</div>
        </div>

        {/* 내용 */}
        <div className="chatreview-body">
          {loading ? (
            <div className="chatreview-loading">로딩 중…</div>
          ) : (
            <>
              <div className="chatreview-title">
                {myName}님,
                <br />
                {otherName}님과 링크유는 어떠셨나요?
              </div>

              {/* 친절도 별점 */}
              <div className="chatreview-starbox">
                <div className="chatreview-starbox-title">
                  {otherName}님은 친절하셨나요?
                </div>
                <div className="chatreview-star-row">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <img
                      key={v}
                      src={v <= kindnessScore ? fullStar : emptyStar}
                      alt={`${v} star`}
                      className="chatreview-star"
                      onClick={() => setKindnessScore(v)}
                    />
                  ))}
                </div>
              </div>

              {/* 상단 세 가지 선택 */}
              <div className="chatreview-rating-tabs">
                <div
                  className={
                    "chatreview-rating-square" +
                    (relationRating === "BAD" ? " active" : "")
                  }
                  onClick={() => setRelationRating("BAD")}
                >
                  <img src={badIcon} className="icon" alt="별로예요" />
                  <div className="chatreview-rating-label">별로예요</div>
                </div>
                <div
                  className={
                    "chatreview-rating-square" +
                    (relationRating === "GOOD" ? " active" : "")
                  }
                  onClick={() => setRelationRating("GOOD")}
                >
                  <img src={sosoIcon} className="icon" alt="좋아요" />
                  <div className="chatreview-rating-label">좋아요</div>
                </div>
                <div
                  className={
                    "chatreview-rating-square" +
                    (relationRating === "BEST" ? " active" : "")
                  }
                  onClick={() => setRelationRating("BEST")}
                >
                  <img src={goodIcon} className="icon" alt="최고예요" />
                  <div className="chatreview-rating-label">최고예요</div>
                </div>
              </div>

              {/* 텍스트 후기 */}
              <div className="chatreview-textarea-label">
                따뜻한 후기를 남겨보아요.
                <span className="chatreview-textarea-sub">(선택사항)</span>
              </div>
              <textarea
                className="chatreview-textarea"
                placeholder="여기에 적어주세요. (선택사항)"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="chatreview-bottom">
          <button
            type="button"
            className="chatreview-submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            후기 남기기
          </button>
        </div>
      </div>
    </div>
  );
}