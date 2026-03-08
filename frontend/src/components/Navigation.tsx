import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavbarLogoImg from "./NavbarIcons/Navbar_logo.png";
import { ChevronDown } from "lucide-react";

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { name: "Home", link: "/home" },
    { name: "Command Center", link: "/command-center" },
    { name: "Targeting Intel", link: "/targeting_intel" },
    { name: "Ad Surveillance", link: "/ad-surveillance" },
    { name: "Auto Create", link: "/auto-create" },
  ];

  const logout = () => {
    // Clear only auth-related keys so brand identity and other preferences persist
    const brandAssets = localStorage.getItem('brandIdentityAssets');
    localStorage.clear();
    if (brandAssets) localStorage.setItem('brandIdentityAssets', brandAssets);
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

              {/* Profile dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1.5 bg-[#1f1f1f] text-white hover:bg-[#2a2a2a] transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-500 flex items-center justify-center text-white shrink-0">
                    👤
                  </div>
                  <span className="font-medium max-w-[120px] truncate">
                    Hello, {userName ?? 'User'}
                  </span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#1a1a1a] border border-gray-700 shadow-xl py-1 z-50">
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/my-campaigns'); }}
                      className="w-full px-4 py-3 text-left text-gray-200 hover:bg-white/10 transition-colors font-medium"
                    >
                      Published Ads
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/brand-identity'); }}
                      className="w-full px-4 py-3 text-left text-gray-200 hover:bg-white/10 transition-colors font-medium"
                    >
                      Brand Identity
                    </button>
                  </div>
                )}
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