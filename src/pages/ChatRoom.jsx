// src/pages/ChatRoom.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import "../styles/chat/chatRoom.css";

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

/** 상대 프로필 URL 절대경로 변환 */
function toAbs(url) {
  if (!url) return "";
  return /^https?:\/\//i.test(url)
    ? url
    : `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

/** 백엔드 응답 roomItem 에서 상대 유저 객체 뽑기 */
function pickOtherUser(roomItem) {
  return (
    roomItem.otherUser ||
    roomItem.partner ||
    roomItem.partnerUser ||
    roomItem.otherUserInfo ||
    roomItem.other ||
    roomItem.receiverUser ||
    roomItem.targetUser ||
    roomItem.ownerUser ||
    null
  );
}

/** roomItem + otherUserObj 에서 상대 userId(pk) 후보 */
function pickReceiverId(roomItem, otherUserObj) {
  return (
    roomItem.otherUserId ||
    roomItem.partnerUserId ||
    roomItem.receiverUserId ||
    roomItem.targetUserId ||
    (otherUserObj && (otherUserObj.id || otherUserObj.userPk)) ||
    null
  );
}

/* ================================= */

export default function ChatRoom() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const loc = useLocation();

  const initialDraft = loc.state?.draft || "";
  const hintReceiverId = loc.state?.hintReceiverId ?? null;
  const talentPostId = loc.state?.talentPostId ?? null; // 🔹 이 채팅에서 LinkU 제안 시 기준이 되는 게시글

  // 🔹 상대 정보
  const [otherUser, setOtherUser] = useState(loc.state?.otherUser || null);

  const [me, setMe] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [wsStatus, setWsStatus] = useState("idle");
  const [receiverId, setReceiverId] = useState(hintReceiverId);

  const [menuOpen, setMenuOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // LinkU 상태
  const [linkuState, setLinkuState] = useState({
    linked: false,
    canReview: false,
    connectionId: null,
    status: null, // PENDING / ACCEPTED / REJECTED
  });

  // 상단 LinkU 버튼용 상태
  const [confirmOpen, setConfirmOpen] = useState(false); // "제안하시겠어요?" 박스
  const [myProposalPending, setMyProposalPending] = useState(false); // 내가 보낸 제안이 대기중인지

  // 첨부 메뉴 (앨범/카메라/파일)
  const [attachOpen, setAttachOpen] = useState(false);

  const stompRef = useRef(null);
  const listRef = useRef(null);
  const sentDraftRef = useRef(false);

  const token = useMemo(() => localStorage.getItem(TOKEN_KEY) || "", []);

  /* ===== 상대 프로필 src ===== */
  const otherAvatarSrc = useMemo(() => {
    if (!otherUser) return "";
    const raw =
      otherUser.avatar ||
      otherUser.profileImageUrl ||
      otherUser.authorProfileImageUrl ||
      otherUser.avatarUrl ||
      otherUser.photoUrl ||
      otherUser.imageUrl ||
      "";
    return raw ? toAbs(raw) : "";
  }, [otherUser]);

  const myDisplayName = me?.name || me?.nickname || me?.userId || "사용자";
  const otherDisplayName =
    otherUser?.name || otherUser?.userId || otherUser?.nickname || "상대";

  const otherLoginId =
    otherUser?.userId || otherUser?.loginId || otherUser?.username || null;

  const goOtherProfile = (e) => {
    if (e) e.stopPropagation();
    if (!otherLoginId) return;
    nav(`/profile/${encodeURIComponent(otherLoginId)}`);
  };

  /* ===== 날짜/시간 유틸 ===== */
  function getDayKey(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }
  function getMinuteKey(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const yy = d.getFullYear();
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    const hh = d.getHours().toString().padStart(2, "0");
    const mi = d.getMinutes().toString().padStart(2, "0");
    return `${yy}-${mm}-${dd} ${hh}:${mi}`;
  }
  function formatDateLabel(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const yy = d.getFullYear();
    const mm = d.getMonth() + 1;
    const dd = d.getDate();
    return `${yy}년 ${mm}월 ${dd}일`;
  }
  function formatTimeLabel(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const isPM = h >= 12;
    let hh = h % 12;
    if (hh === 0) hh = 12;
    const ampm = isPM ? "오후" : "오전";
    return `${ampm} ${hh}:${m}`;
  }

  /* ===== 항상 맨 아래로 스크롤 ===== */
  function scrollToBottom() {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setTimeout(scrollToBottom, 0);
  }, []);

  /* ===== 내 정보 + LinkU 상태 + 과거 메시지 + 상대 프로필 로드 ===== */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const meRes = await apiGet("/api/me");
        if (!alive) return;
        setMe(meRes);

        // 🔹 상대 정보: state 로 없으면 /api/chat/my-rooms 에서 찾아오기
        if (!otherUser) {
          try {
            const list = await apiGet("/api/chat/my-rooms");
            if (!alive) return;
            const arr = Array.isArray(list) ? list : [];
            const roomItem = arr.find(
              (r) => String(r.roomId) === String(roomId)
            );
            if (roomItem) {
              const ou = pickOtherUser(roomItem);
              if (ou) setOtherUser(ou);

              // receiverId도 여기서 한 번 정확히 세팅
              if (!hintReceiverId) {
                const rid = pickReceiverId(roomItem, ou);
                if (rid) setReceiverId(rid);
              }
            }
          } catch (e) {
            console.warn("otherUser load error from my-rooms:", e);
          }
        }

        // 🔹 LinkU 상태 조회
        try {
          const st = await apiGet(`/api/chat/rooms/${roomId}/linku`);
          if (!alive) return;
          setLinkuState({
            linked: !!st.linked,
            canReview: !!st.canReview,
            connectionId: st.connectionId ?? null,
            status: st.status ?? null,
          });
          // 새로 들어왔을 땐 "제안 완료" 상태는 모른다고 가정 -> false
          setMyProposalPending(false);
        } catch (e) {
          console.warn("linku state load error:", e);
        }

        // 🔹 기존 메시지
        try {
          const hist = await apiGet(`/api/chat/rooms/${roomId}/messages`);
          if (!alive) return;
          const arr = Array.isArray(hist) ? hist : [];
          setMessages(arr);

          // receiverId 추론 (fallback)
          if (!receiverId && arr.length > 0) {
            const myPk = meRes?.id ?? meRes?.userPk ?? null;
            const first = arr[0];
            const inferred =
              first.senderId === myPk ? first.receiverId : first.senderId;
            if (inferred) setReceiverId(inferred);
          }

          setTimeout(scrollToBottom, 0);
        } catch (e) {
          console.error(e);
          alert("채팅방을 불러오지 못했습니다.");
          nav("/chat");
        }
      } catch {
        alert("로그인이 필요합니다.");
        nav("/login");
        return;
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  /* ===== STOMP 연결 ===== */
  useEffect(() => {
    if (!roomId || !token) return;
    setWsStatus("connecting");

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      debug: () => {},
      onConnect: () => {
        setWsStatus("connected");
        client.subscribe(`/topic/chat.room.${roomId}`, (msg) => {
          try {
            const payload = JSON.parse(msg.body);

            const kind =
              payload.kind ||
              payload.messageKind ||
              payload.type ||
              payload.messageType ||
              null;

            const linkuId =
              payload.linkuId ??
              payload.linkuConnectionId ??
              payload.linkuConnectionID ??
              null;

            const normalized = { ...payload, kind, linkuId };

            setMessages((prev) => [...prev, normalized]);

            // 수락/거절 이벤트면 LinkU 상태 갱신 + 상단 버튼 상태 초기화
            if (kind === "LINKU_ACCEPT") {
              setLinkuState((prev) => ({
                ...prev,
                linked: true,
                canReview:
                  typeof payload.canReview === "boolean"
                    ? payload.canReview
                    : prev.canReview,
                connectionId: linkuId ?? prev.connectionId,
                status: "ACCEPTED",
              }));
              setMyProposalPending(false);
            } else if (kind === "LINKU_REJECT") {
              setLinkuState((prev) => ({
                ...prev,
                status: "REJECTED",
              }));
              setMyProposalPending(false);
            }
          } catch (e) {
            console.error("STOMP message parse error", e);
          }
        });

        setTimeout(scrollToBottom, 0);
      },
      onStompError: () => setWsStatus("error"),
      onWebSocketClose: () => setWsStatus("idle"),
    });

    client.activate();
    stompRef.current = client;

    return () => {
      try {
        client.deactivate();
      } catch {}
      stompRef.current = null;
    };
  }, [roomId, token]);

  /* ===== TalentDetail에서 넘어온 첫 draft 자동 전송 ===== */
  useEffect(() => {
    // 웹소켓 연결 안 됐으면 아무 것도 안 함
    if (wsStatus !== "connected") return;

    // 초깃값이 없거나, 이미 한 번 보냈으면 종료
    if (!initialDraft || sentDraftRef.current) return;

    // 내 정보 / 상대 PK / 스톰프 클라이언트 없으면 종료
    if (!me || !receiverId || !stompRef.current) return;

    // 같은 컴포넌트 생애 주기에서 다시 안 보내도록 ref 마킹
    sentDraftRef.current = true;

    // 실제 메시지 전송
    stompRef.current.publish({
      destination: "/app/chat.send",
      body: JSON.stringify({
        roomId: Number(roomId),
        receiverId,
        content: initialDraft,
      }),
    });

    // 🔥 이 history 엔트리에서 draft 를 비워서,
    //    뒤로가기/다시 입장해도 자동 전송이 또 안 일어나도록 막기
    if (loc.state?.draft) {
      nav(".", {
        replace: true,
        state: { ...loc.state, draft: "" },
      });
    }
  }, [wsStatus, initialDraft, me, receiverId, roomId, loc, nav]);

  /* ===== 상태/헬퍼 ===== */
  function statusLabel() {
    if (wsStatus === "connected") return "";
    if (wsStatus === "connecting") return "연결 중…";
    if (wsStatus === "error") return "연결 오류";
    return "대기";
  }
  function statusColor() {
    if (wsStatus === "connected") return "#22c55e";
    if (wsStatus === "connecting") return "#f59e0b";
    if (wsStatus === "error") return "#ef4444";
    return "#9ca3af";
  }

  /* ===== 시스템/공지 타입 판별 헬퍼 ===== */
  function isSystemKind(kind) {
    return (
      kind === "LINKU_PROPOSE" ||
      kind === "LINKU_ACCEPT" ||
      kind === "LINKU_REJECT" ||
      kind === "REVIEW_NOTICE"
    );
  }

  // 상단 LinkU 버튼 텍스트 & 비활성 여부
  const linkuButtonDisabled =
    myProposalPending && linkuState.status === "PENDING";
  const linkuButtonLabel = linkuButtonDisabled ? "제안 완료" : "LinkU";
  const linkuButtonClass = linkuButtonDisabled
    ? "chatroom-linku-btn disabled"
    : "chatroom-linku-btn";

  // 🔹 후기 버튼 존재 여부
  const hasReviewButton = linkuState.linked && linkuState.canReview;

  // 🔹 첨부 패널 위치: 후기 버튼 유무에 따라 bottom 조정
  const attachPanelStyle = {
    bottom: hasReviewButton ? 120 : 72,
  };

  /* ===== 메시지 전송 ===== */
  function send() {
    const text = (input || "").trim();
    if (!text || !stompRef.current || wsStatus !== "connected" || !receiverId)
      return;

    stompRef.current.publish({
      destination: "/app/chat.send",
      body: JSON.stringify({
        roomId: Number(roomId),
        receiverId,
        content: text,
      }),
    });

    setInput("");
    setTimeout(scrollToBottom, 0);
  }

  /* ===== LinkU 제안 보내기 ===== */
  async function handleLinkuClick() {
    if (!receiverId) {
      alert("상대 정보를 불러오는 중입니다.");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/api/chat/rooms/${roomId}/linku/propose`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          credentials: "include",
          body: JSON.stringify({
            targetUserId: receiverId,
            message: "함께 LinkU를 제안했습니다.",
            talentPostId: talentPostId, // 🔹 이번 LinkU는 어떤 게시글 기준인지 백엔드로 전달
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
      if (!res.ok) throw new Error(data.message || "LinkU 제안 실패");

      setLinkuState((prev) => ({
        ...prev,
        status: data.status ?? "PENDING",
        connectionId: data.connectionId ?? prev.connectionId,
        linked: prev.linked,
        canReview:
          typeof data.canReview === "boolean" ? data.canReview : prev.canReview,
      }));
      setMyProposalPending(true);
      setConfirmOpen(false);
    } catch (e) {
      console.error(e);
      alert(e.message || "LinkU 제안에 실패했습니다.");
    }
  }

  /* ===== LinkU 수락/거절 ===== */
  async function handleAcceptLinku(linkuIdFromMessage) {
    const linkuId = linkuIdFromMessage ?? linkuState.connectionId;

    if (!linkuId) {
      console.error("handleAcceptLinku called without linkuId", {
        linkuIdFromMessage,
        linkuState,
      });
      alert("LinkU 정보가 없습니다. 페이지를 새로고침 해주세요.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/chat/linku/${linkuId}/accept`, {
        method: "POST",
        headers: { ...authHeaders() },
        credentials: "include",
      });
      const raw = await res.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw };
      }
      if (!res.ok) throw new Error(data.message || "수락 실패");

      setLinkuState((prev) => ({
        linked: true,
        canReview:
          typeof data.canReview === "boolean" ? data.canReview : prev.canReview,
        connectionId: data.connectionId ?? linkuId,
        status: data.status ?? "ACCEPTED",
      }));
      setMyProposalPending(false);

      setMessages((prev) =>
        prev.map((m) =>
          (m.linkuId ?? m.linkuConnectionId) === linkuId
            ? { ...m, linkuStatus: "ACCEPTED" }
            : m
        )
      );
    } catch (e) {
      console.error(e);
      alert(e.message || "LinkU 수락에 실패했습니다.");
    }
  }

  async function handleRejectLinku(linkuIdFromMessage) {
    const linkuId = linkuIdFromMessage ?? linkuState.connectionId;

    if (!linkuId) {
      console.error("handleRejectLinku called without linkuId", {
        linkuIdFromMessage,
        linkuState,
      });
      alert("LinkU 정보가 없습니다. 페이지를 새로고침 해주세요.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/chat/linku/${linkuId}/reject`, {
        method: "POST",
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (!res.ok) throw new Error("거절 실패");

      setLinkuState((prev) => ({
        ...prev,
        status: "REJECTED",
      }));
      setMyProposalPending(false);

      setMessages((prev) =>
        prev.map((m) =>
          (m.linkuId ?? m.linkuConnectionId) === linkuId
            ? { ...m, linkuStatus: "REJECTED" }
            : m
        )
      );
    } catch (e) {
      console.error(e);
      alert(e.message || "LinkU 거절에 실패했습니다.");
    }
  }

  /* ===== 방 나가기 ===== */
  async function handleLeaveRoom() {
    if (leaving) return;
    if (
      !window.confirm(
        "채팅방을 나가시겠습니까? 이 방은 내 채팅 목록에서 사라집니다."
      )
    )
      return;

    try {
      setLeaving(true);
      const res = await fetch(`${API_BASE}/api/chat/rooms/${roomId}/leave`, {
        method: "DELETE",
        headers: { ...authHeaders() },
        credentials: "include",
      });

      if (!res.ok) {
        const raw = await res.text();
        let data;
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = { message: raw };
        }
        throw new Error(data.message || "채팅방 나가기에 실패했습니다.");
      }

      if (stompRef.current) {
        try {
          stompRef.current.deactivate();
        } catch {}
        stompRef.current = null;
      }

      alert("채팅방을 나갔습니다.");
      setMenuOpen(false);
      nav("/chat");
    } catch (e) {
      console.error(e);
      alert(e.message || "채팅방 나가기에 실패했습니다.");
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="chatroom-stage">
      <div className="chatroom-card">
        {/* 상단바 */}
        <div className="chatroom-top">
          <button
            className="chatroom-back-btn"
            onClick={() => nav("/chat")}
          >
            ←
          </button>

          {otherUser ? (
            <div
              className="chatroom-top-titlebox"
              role="button"
              tabIndex={0}
              onClick={goOtherProfile}
              onKeyDown={(e) => e.key === "Enter" && goOtherProfile(e)}
            >
              <div className="chatroom-top-avatar">
                {otherAvatarSrc ? (
                  <img
                    src={otherAvatarSrc}
                    alt="상대 프로필"
                    className="chatroom-top-avatar-img"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  "👤"
                )}
              </div>
              <div className="chatroom-top-namebox">
                <div className="chatroom-top-name">{otherDisplayName}</div>
                {otherUser?.major && (
                  <div className="chatroom-top-sub">{otherUser.major}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="chatroom-top-fallback">채팅방</div>
          )}

          <div className="chatroom-top-right">
            {/* 상단 LinkU 버튼 */}
            <button
              type="button"
              className={linkuButtonClass}
              disabled={linkuButtonDisabled}
              onClick={() => {
                if (!linkuButtonDisabled) setConfirmOpen(true);
              }}
            >
              {linkuButtonLabel}
            </button>

            <span className="chatroom-status-text">{statusLabel()}</span>
            <button
              className="chatroom-menu-btn"
              onClick={() => setMenuOpen((v) => !v)}
            >
              ☰
            </button>
          </div>

          {menuOpen && (
            <div className="chatroom-menu-wrap">
              <div className="chatroom-menu-panel">
                <div className="chatroom-menu-status">
                  <span
                    className="chatroom-menu-dot"
                    style={{ backgroundColor: statusColor() }}
                  />
                  <span>{statusLabel()}</span>
                </div>
                <button
                  className="chatroom-menu-leave"
                  onClick={handleLeaveRoom}
                  disabled={leaving}
                >
                  {leaving ? "나가는 중…" : "채팅방 나가기"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 메시지 영역 */}
        <div ref={listRef} className="chatroom-list">
          {messages.length === 0 && (
            <div className="chatroom-empty">대화를 시작해보세요.</div>
          )}

          {messages.map((m, idx) => {
            const myPk = me?.id ?? me?.userPk;

            const kind =
              m.kind || m.messageKind || m.type || m.messageType || null;
            const linkuId =
              m.linkuId ?? m.linkuConnectionId ?? m.linkuConnectionID ?? null;

            const mine = myPk != null && m.senderId === myPk;

            // 바로 이전 메시지 (공지 포함) – 날짜 구분용
            const prev = idx > 0 ? messages[idx - 1] : null;

            // 🔹 현재 메시지의 시스템/공지 여부
            const currIsSystem = isSystemKind(kind);

            // 🔹 직전 "텍스트" 메시지 (공지 제외)
            let prevText = null;
            let prevTextIndex = null;
            for (let j = idx - 1; j >= 0; j--) {
              const pm = messages[j];
              const pk =
                pm.kind || pm.messageKind || pm.type || pm.messageType || null;
              if (!isSystemKind(pk)) {
                prevText = pm;
                prevTextIndex = j;
                break;
              }
            }

            // 🔹 다음 "텍스트" 메시지 (공지 제외)
            let nextText = null;
            let nextTextIndex = null;
            for (let j = idx + 1; j < messages.length; j++) {
              const nm = messages[j];
              const nk =
                nm.kind || nm.messageKind || nm.type || nm.messageType || null;
              if (!isSystemKind(nk)) {
                nextText = nm;
                nextTextIndex = j;
                break;
              }
            }

            // 🔹 이전 텍스트와 현재 사이에 공지가 끼었는지
            const hasSystemBetweenPrev =
              prevTextIndex != null && prevTextIndex < idx - 1;

            // 🔹 현재와 다음 텍스트 사이에 공지가 끼었는지
            const hasSystemBetweenNext =
              nextTextIndex != null && nextTextIndex > idx + 1;

            // 🔹 날짜 구분은 "바로 직전 메시지(prev)" 기준 (공지 포함)
            const dayKey = getDayKey(m.createdAt);
            const prevDayKey = prev ? getDayKey(prev.createdAt) : "";
            const showDateDivider = !prev || dayKey !== prevDayKey;

            /* ===== 시간 표시 로직 (텍스트 메시지만) ===== */
            let showTime = false;
            if (!currIsSystem) {
              const myMinute = getMinuteKey(m.createdAt);
              const nextMinute = nextText ? getMinuteKey(nextText.createdAt) : "";

              const clusterEnd =
                !nextText ||
                nextText.senderId !== m.senderId ||
                nextMinute !== myMinute ||
                hasSystemBetweenNext;

              showTime = !!m.createdAt && clusterEnd;
            }

            /* ===== 아바타 노출 여부 ===== */
            let showOtherAvatar = false;
            if (!mine && !currIsSystem) {
              const myMinute = getMinuteKey(m.createdAt);
              const prevMinute = prevText
                ? getMinuteKey(prevText.createdAt)
                : "";

              const isNewCluster =
                !prevText ||
                prevText.senderId !== m.senderId ||
                prevMinute !== myMinute ||
                hasSystemBetweenPrev;

              showOtherAvatar = isNewCluster;
            }

            /* ===== LinkU 제안 카드 ===== */
            if (kind === "LINKU_PROPOSE") {
              const isTarget = !mine;

              let status = m.linkuStatus;
              if (
                !status &&
                linkuState.status &&
                linkuState.connectionId === linkuId
              ) {
                status = linkuState.status;
              }
              if (!status) status = "PENDING";

              return (
                <React.Fragment key={`linku-propose-${m.id}-${idx}`}>
                  {showDateDivider && (
                    <div className="chatroom-date-divider">
                      <span className="chatroom-date-label">
                        {formatDateLabel(m.createdAt)}
                      </span>
                    </div>
                  )}

                  <div className="chatroom-linku-propose-wrap">
                    <div className="chatroom-linku-card">
                      <div className="chatroom-linku-title">LinkU 제안</div>
                      <div className="chatroom-linku-body">
                        {m.content || "함께 LinkU를 제안했습니다."}
                      </div>

                      {isTarget && status === "PENDING" && (
                        <div className="chatroom-linku-btnrow">
                          <button
                            type="button"
                            className="chatroom-linku-accept"
                            onClick={() => handleAcceptLinku(linkuId)}
                          >
                            수락
                          </button>
                          <button
                            type="button"
                            className="chatroom-linku-reject"
                            onClick={() => handleRejectLinku(linkuId)}
                          >
                            거절
                          </button>
                        </div>
                      )}

                      {!isTarget && status === "PENDING" && (
                        <div className="chatroom-linku-wait">
                          상대의 응답을 기다리는 중입니다…
                        </div>
                      )}

                      {status === "ACCEPTED" && (
                        <div className="chatroom-linku-status accepted">
                          LinkU가 수락되었습니다.
                        </div>
                      )}
                      {status === "REJECTED" && (
                        <div className="chatroom-linku-status rejected">
                          LinkU가 거절되었습니다.
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            }

            /* ===== LinkU 수락/거절 공지 ===== */
            if (kind === "LINKU_ACCEPT" || kind === "LINKU_REJECT") {
              const noticeText =
                m.content ||
                (kind === "LINKU_ACCEPT"
                  ? `${otherDisplayName}님과 LinkU 했어요.`
                  : "LinkU가 거절되었습니다.");

              return (
                <React.Fragment key={`linku-notice-${m.id}-${idx}`}>
                  {showDateDivider && (
                    <div className="chatroom-date-divider">
                      <span className="chatroom-date-label">
                        {formatDateLabel(m.createdAt)}
                      </span>
                    </div>
                  )}

                  <div className="chatroom-system-wrap">
                    <div className="chatroom-system-bubble">{noticeText}</div>
                  </div>
                </React.Fragment>
              );
            }

            /* ===== 후기 공지 (REVIEW_NOTICE) ===== */
            if (kind === "REVIEW_NOTICE") {
              const noticeText =
                m.content || "상대방이 LinkU 후기를 남겼습니다.";

              const isReceiver = myPk != null && m.receiverId === myPk;

              return (
                <React.Fragment key={`review-notice-${m.id}-${idx}`}>
                  {showDateDivider && (
                    <div className="chatroom-date-divider">
                      <span className="chatroom-date-label">
                        {formatDateLabel(m.createdAt)}
                      </span>
                    </div>
                  )}

                  <div className="chatroom-system-wrap">
                    <div className="chatroom-system-bubble review">
                      <span>{noticeText}</span>
                      {isReceiver && (
                        <button
                          type="button"
                          className="chatroom-system-review-btn"
                          onClick={() =>
                            nav("/my", {
                              state: {
                                tab: "reviews",
                                fromRoomId: Number(roomId),
                              },
                            })
                          }
                        >
                          받은 후기 보러가기
                        </button>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            }

            /* ===== 일반 텍스트 메시지 ===== */
            return (
              <React.Fragment key={`${m.id}-${m.createdAt || idx}`}>
                {showDateDivider && (
                  <div className="chatroom-date-divider">
                    <span className="chatroom-date-label">
                      {formatDateLabel(m.createdAt)}
                    </span>
                  </div>
                )}

                {mine ? (
                  <div
                    className="chatroom-bubble-row"
                    style={{ justifyContent: "flex-end" }}
                  >
                    <div className="chatroom-bubble chatroom-bubble-me">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div
                    className="chatroom-bubble-row"
                    style={{ justifyContent: "flex-start" }}
                  >
                    {showOtherAvatar ? (
                      <div
                        className="chatroom-other-avatar"
                        role="button"
                        tabIndex={0}
                        onClick={goOtherProfile}
                        onKeyDown={(e) => e.key === "Enter" && goOtherProfile(e)}
                      >
                        {otherAvatarSrc ? (
                          <img
                            src={otherAvatarSrc}
                            alt="상대 프로필"
                            className="chatroom-other-avatar-img"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          "👤"
                        )}
                      </div>
                    ) : (
                      <div className="chatroom-other-avatar-spacer" />
                    )}

                    <div className="chatroom-bubble chatroom-bubble-other">
                      {m.content}
                    </div>
                  </div>
                )}

                {showTime && (
                  <div
                    className={
                      mine ? "chatroom-time-me" : "chatroom-time-other"
                    }
                  >
                    {formatTimeLabel(m.createdAt)}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* 🔹 플러스 눌렀을 때 첨부 메뉴 */}
        {attachOpen && (
          <div className="chatroom-attach-panel" style={attachPanelStyle}>
            <button
              type="button"
              className="chatroom-attach-item"
              onClick={() => alert("앨범에서 사진 첨부는 추후 구현 예정입니다.")}
            >
              앨범
            </button>
            <button
              type="button"
              className="chatroom-attach-item"
              onClick={() => alert("카메라 첨부는 추후 구현 예정입니다.")}
            >
              카메라
            </button>
            <button
              type="button"
              className="chatroom-attach-item"
              onClick={() => alert("파일 첨부는 추후 구현 예정입니다.")}
            >
              파일
            </button>
          </div>
        )}

        {/* 하단 영역 */}
        <div className="chatroom-bottom">
          {/* 입력바 */}
          <div className="chatroom-bottom-row">
            <button
              type="button"
              className="chatroom-plus-btn"
              onClick={() => setAttachOpen((v) => !v)}
              disabled={wsStatus !== "connected"}
            >
              +
            </button>

            <input
              className="chatroom-input"
              value={input}
              placeholder="메시지를 입력하세요"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={wsStatus !== "connected"}
            />
            <button
              className="chatroom-send-btn"
              onClick={send}
              disabled={wsStatus !== "connected"}
            >
              보내기
            </button>
          </div>

          {/* ✅ LinkU ACCEPTED + canReview 일 때만 후기 보내기 노출 (맨 아래) */}
          {hasReviewButton && (
            <button
              type="button"
              className="chatroom-action-card"
              onClick={() =>
                nav(`/linku/review/${roomId}`, {
                  state: {
                    roomId: Number(roomId),
                    connectionId: linkuState.connectionId,
                    otherUser,
                  },
                })
              }
            >
              후기 보내기
            </button>
          )}
        </div>

        {/* LinkU 제안 확인 박스 */}
        {confirmOpen && (
          <div className="chatroom-confirm-overlay">
            <div className="chatroom-confirm-box">
              <div className="chatroom-confirm-text">
                {otherDisplayName}님에게 LinkU 제안을 하시겠습니까?
              </div>
              <div className="chatroom-confirm-btn-row">
                <button
                  type="button"
                  className="chatroom-confirm-yes"
                  onClick={handleLinkuClick}
                >
                  예
                </button>
                <button
                  type="button"
                  className="chatroom-confirm-no"
                  onClick={() => setConfirmOpen(false)}
                >
                  아니요
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}