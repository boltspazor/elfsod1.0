/* ========== SOCIAL ICON IMPORTS ========== */
import githubIcon from "./SocialIcons/github.svg";
import linkedinIcon from "./SocialIcons/linkedin.svg";
import xIcon from "./SocialIcons/X.svg";

import mailIcon from "./SocialIcons/mail.svg";
import phoneIcon from "./SocialIcons/phone.svg";
import locationIcon from "./SocialIcons/location.svg";

import logoFooter from "./SocialIcons/LogoFooter.png";

export default function Footer() {
  return (
    <footer className="relative w-full bg-gray-500 text-black px-4 sm:px-6 md:px-8 lg:px-16 xl:px-24 pt-12 sm:pt-16 md:pt-20 pb-8 sm:pb-10 md:pb-14 overflow-hidden border-t border-gray-200 mb-16 lg:mb-0">

      {/* ===================== TOP CONTENT GRID ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 md:gap-12">

        {/* ---------- LEFT DESCRIPTION ---------- */}
        <div className="space-y-4 sm:space-y-6 max-w-sm">
          <p className="text-sm sm:text-base text-gray-800 leading-relaxed">
            Your autonomous advertising operating system.
            <br />
            Build smarter campaigns AI-Powered Insights.
          </p>

          {/* Social Icons */}
          <div className="flex items-center gap-3 sm:gap-4">

            <a className="bg-gray-100 rounded-full p-1 hover:opacity-100 opacity-80 transition">
              <img src={xIcon} alt="X" className="w-[18px] h-[18px] brightness-0" />
            </a>

            <a className="bg-gray-100 rounded-full p-1 hover:opacity-100 opacity-80 transition">
              <img src={githubIcon} alt="GitHub" className="w-[18px] h-[18px] brightness-0" />
            </a>

            <a className="bg-gray-100 rounded-full p-1 hover:opacity-100 opacity-80 transition">
              <img src={linkedinIcon} alt="LinkedIn" className="w-[18px] h-[18px] brightness-0" />
            </a>

          </div>

          {/* Newsletter */}
          <div className="space-y-2 sm:space-y-3 pt-4 sm:pt-6">
            <h4 className="font-semibold text-sm sm:text-base text-black">Newsletter</h4>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input
                type="email"
                placeholder="Your Email"
                className="w-full sm:flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-md outline-none focus:border-purple-500"
              />

              <button className="px-4 sm:px-5 py-2 bg-black text-white font-semibold rounded-md hover:bg-gray-900 transition">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* ---------- PRODUCT ---------- */}
        <div>
          <h4 className="font-semibold mb-4">Product</h4>
          <ul className="space-y-3 text-gray-800">
            <li className="hover:text-black cursor-pointer">Features</li>
            <li className="hover:text-black cursor-pointer">Pricing</li>
            <li className="hover:text-black cursor-pointer">Integrations</li>
            <li className="hover:text-black cursor-pointer">API Docs</li>
            <li className="hover:text-black cursor-pointer">Changelog</li>
          </ul>
        </div>

        {/* ---------- COMPANY ---------- */}
        <div>
          <h4 className="font-semibold mb-4">Company</h4>
          <ul className="space-y-3 text-gray-800">
            <li className="hover:text-black cursor-pointer">About Us</li>
            <li className="hover:text-black cursor-pointer">Careers</li>
            <li className="hover:text-black cursor-pointer">Blog</li>
            <li className="hover:text-black cursor-pointer">Press Kit</li>
            <li className="hover:text-black cursor-pointer">Partners</li>
          </ul>
        </div>

        {/* ---------- GET IN TOUCH ---------- */}
        <div>
          <h4 className="font-semibold mb-4">Get In Touch</h4>

          <ul className="space-y-4 text-gray-800">

            <li className="flex items-center gap-3">
              <div className="bg-gray-100 p-1.5 rounded-full">
                <img src={mailIcon} alt="Mail" className="w-[14px] h-[14px]" />
              </div>
              <span>hello@ados.com</span>
            </li>

            <li className="flex items-center gap-3">
              <div className="bg-gray-100 p-1.5 rounded-full">
                <img src={phoneIcon} alt="Phone" className="w-[14px] h-[14px]" />
              </div>
              <span>+1 (234) 567 - 890</span>
            </li>

            <li className="flex items-start gap-3">
              <div className="bg-gray-100 p-1.5 rounded-full mt-0.5">
                <img src={locationIcon} alt="Location" className="w-[14px] h-[14px]" />
              </div>
              <span>
                123 Marketing St.
                <br />
                San Francisco, CA 94105
              </span>
            </li>

          </ul>
        </div>
      </div>

      {/* ===================== FOOTER LOGO ===================== */}
      <div className="absolute right-4 sm:right-8 md:right-12 -bottom-12 md:-bottom-20 hidden sm:block pointer-events-none">
        <img
          src={logoFooter}
          alt="Footer Logo"
          className="w-[300px] sm:w-[400px] md:w-[500px] lg:w-[600px] xl:w-[720px] brightness-0"
        />
      </div>

      {/* ===================== DIVIDER ===================== */}
      <div className="mt-20 border-t border-gray-300" />

      {/* ===================== BOTTOM BAR ===================== */}
      <div className="mt-6 flex flex-col md:flex-row justify-between items-center text-sm text-gray-800 gap-4">
        <span>© 2025 Elfsod. All Rights Reserved.</span>

        <div className="flex gap-6">
          <span className="hover:text-black cursor-pointer">Privacy Policy</span>
          <span className="hover:text-black cursor-pointer">Terms Of Service</span>
          <span className="hover:text-black cursor-pointer">Cookie Policy</span>
          <span className="hover:text-black cursor-pointer">Sitemap</span>
        </div>
      </div>

    </footer>
  );
}