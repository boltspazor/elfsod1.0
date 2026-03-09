import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate, Link } from "react-router-dom"
import { AUTH_API_URL } from "../config"


export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    })
    setError("") // Clear error when user types
  }

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch(`${AUTH_API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Store JWT token in localStorage
        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))
        
        // Redirect to dashboard or home page
        navigate("/")
      } else {
        setError(data.error || "Login failed. Please try again.")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }
return (
  <div className={cn("flex flex-col w-full max-w-[380px] mx-auto", className)} {...props}>

    {/* Header */}
    <div className="text-center mb-10 space-y-2">
      <h1 className="text-[44px] font-semibold text-white tracking-tight">
        Welcome Back!
      </h1>
      <p className="text-gray-400 text-sm">
        Login to your account
      </p>
    </div>

    {/* Form */}
    <form onSubmit={handleSubmit} className="space-y-6">

      {error && (
        <div className="p-3 rounded bg-red-900/30 border border-red-500/40">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Email */}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm text-white">Email</label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="h-11 bg-[#e7ecf3] text-black border-0 rounded-sm px-4 focus-visible:ring-0"
        />
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm text-white">Password</label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
          className="h-11 bg-[#e7ecf3] text-black border-0 rounded-sm px-4 focus-visible:ring-0"
        />
      </div>

      {/* Login Button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-14 rounded-sm bg-gradient-to-r from-[#ff6db3] to-[#ff2f92] hover:opacity-95 text-white text-lg font-medium shadow-md"
      >
        {isLoading ? "Logging in..." : "Login"}
      </Button>

    </form>

    {/* Sign Up */}
    <div className="text-center mt-8">
      <p className="text-sm text-gray-400">
        Don’t have an account?{" "}
        <Link to="/sign-up" className="text-white font-medium hover:underline">
          Sign Up
        </Link>
      </p>
    </div>

    {/* Terms */}
    <div className="text-center mt-4 text-xs text-gray-500 leading-relaxed">
      By clicking Continue, you agree to our{" "}
      <a href="/terms" className="underline hover:text-gray-400">Terms Of Service</a> and{" "}
      <a href="/privacy" className="underline hover:text-gray-400">Privacy Policy</a>
    </div>

  </div>

     
  )

  

}