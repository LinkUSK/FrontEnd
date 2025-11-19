// src/components/BottomNav.jsx
import { NavLink } from "react-router-dom";
import '../styles/bottomNav.css';
import homeIcon from '/images/home-icon.png'
import postIcon from '/images/post-icon.png'
import chatIcon from '/images/chat-icon.png'
import myIcon from '/images/mypage-icon.png'
import homeIconActive from '/images/home-icon-active.png'
import postIconActive from '/images/post-icon-active.png'
import chatIconActive from '/images/chat-icon-active.png'
import myIconActive from '/images/mypage-icon-active.png'

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-bar">
        {/* 홈 */}
        <NavLink
          to="/home"
          className={({ isActive }) =>
            "bottom-nav-item" + (isActive ? " active" : "")
          }
        >
          {({ isActive }) => (
            <>
              <img
                src={isActive ? homeIconActive : homeIcon}
                alt="Home"
                className="bottom-nav-icon"
              />
              <div className="bottom-nav-label">홈</div>
            </>
          )}
        </NavLink>

        {/* 재능 등록 */}
        <NavLink
          to="/create"
          className={({ isActive }) =>
            "bottom-nav-item" + (isActive ? " active" : "")
          }
        >
          {({ isActive }) => (
            <>
              <img
                src={isActive ? postIconActive : postIcon}
                alt="Create"
                className="bottom-nav-icon"
              />
              <div className="bottom-nav-label">재능 등록</div>
            </>
          )}
        </NavLink>

        {/* 채팅 */}
        <NavLink
          to="/chat"
          className={({ isActive }) =>
            "bottom-nav-item" + (isActive ? " active" : "")
          }
        >
          {({ isActive }) => (
            <>
              <img
                src={isActive ? chatIconActive : chatIcon}
                alt="Chat"
                className="bottom-nav-icon"
              />
              <div className="bottom-nav-label">채팅</div>
            </>
          )}
        </NavLink>

        {/* 마이페이지 */}
        <NavLink
          to="/my"
          className={({ isActive }) =>
            "bottom-nav-item" + (isActive ? " active" : "")
          }
        >
          {({ isActive }) => (
            <>
              <img
                src={isActive ? myIconActive : myIcon}
                alt="My Page"
                className="bottom-nav-icon"
              />
              <div className="bottom-nav-label">마이페이지</div>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}