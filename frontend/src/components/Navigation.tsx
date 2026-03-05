import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavbarLogoImg from "./NavbarIcons/Navbar_logo.png";

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const [isLoggedIn] = useState(() => {
    return !!localStorage.getItem("token");
  });
  const [userName] = useState<string | null>(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const parsed = JSON.parse(user);
        return parsed.name || "User";
      } catch {
        return null;
      }
    }
    return null;
  });

  const navItems = [
    { name: "Home", link: "/home" },
    { name: "Command Center", link: "/command-center" },
    { name: "Targeting Intel", link: "/targeting_intel" },
    { name: "Ad Surveillance", link: "/ad-surveillance" },
    { name: "Auto Create", link: "/auto-create" },
    { name: "Reverse Engineering", link: "/video-analysis" }
  ];

  const logout = () => {
    localStorage.clear();
    navigate("/");
    window.location.reload();
  };

  return (
    <div className="w-full bg-black px-12 py-6">

      {/* ================= PRE LOGIN ================= */}
      {!isLoggedIn && (
        <div className="flex items-center justify-between">

          <img
            src={NavbarLogoImg}
            className="h-8 object-contain"
            alt="ELFSOD"
          />

          <div className="flex gap-4">
            <button
              onClick={() => navigate("/sign-up")}
              className="px-6 py-2 rounded-xl bg-white text-black font-semibold"
            >
              Sign Up
            </button>

            <button
              onClick={() => navigate("/login")}
              className="px-6 py-2 rounded-xl bg-[#ff5b8d] text-white font-semibold"
            >
              Login
            </button>
          </div>
        </div>
      )}

      {/* ================= POST LOGIN ================= */}
      {isLoggedIn && (
        <>
          <div className="flex items-center justify-between">

            {/* LOGO */}
            <img
              src={NavbarLogoImg}
              className="h-8 object-contain"
              alt="ELFSOD"
            />

            {/* CENTER MENU */}
            <div className="flex gap-10 text-gray-300 font-medium">

              {navItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => navigate(item.link)}
                  className={`relative hover:text-white transition ${
                    item.name === "Home" && "text-white"
                  }`}
                >
                  {item.name}

                  {/* {item.name === "Home" && (
                    <span className="absolute left-0 -bottom-2 h-[2px] w-full bg-white rounded-full" />
                  )} */}
                </button>
              ))}
            </div>

            {/* RIGHT SIDE */}
            <div className="flex items-center gap-4">

              <button
                onClick={logout}
                className="px-6 py-2 rounded-full bg-[#1f1f1f] text-white font-semibold"
              >
                Logout
              </button>

              <span className="text-white">
                Hello, {userName}
              </span>

              <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white">
                👤
              </div>
            </div>

          </div>

          {/* BOTTOM LINE */}
          <div className="mt-6 w-full h-[1px] bg-gray-700 opacity-60" />
        </>
      )}
    </div>
  );
};

export default Navigation;