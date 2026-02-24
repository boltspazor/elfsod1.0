import { GalleryVerticalEnd } from "lucide-react"

import { LoginForm } from "@/components/Login-form"
import LoginAnimatedTile4x3 from "@/components/LoginAnimatedTile4x3"
import Footer from "@/components/Footer"

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen bg-black">

      {/* Main content: left tiles + right form */}
      <div className="flex flex-1">

        {/* Left side - Animated Tiles */}
        <div className="hidden lg:flex lg:w-[55%] overflow-hidden">
          <LoginAnimatedTile4x3 />
        </div>

        {/* Right side - Login Form */}
        <div className="flex w-full lg:w-[45%] items-center justify-center p-6 md:p-10">
          <div className="flex w-full max-w-sm flex-col gap-6">
            <span className="flex items-center gap-2 self-center font-medium text-white">
              <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-4" />
              </div>
              Ad OS
            </span>
            <LoginForm />
          </div>
        </div>

      </div>

      {/* Footer - full width at the very bottom */}
      <Footer />

    </div>
  )
}
