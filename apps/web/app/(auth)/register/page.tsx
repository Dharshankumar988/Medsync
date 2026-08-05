"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { Button } from "@medsync/ui";
import { Input } from "@medsync/ui";
import { 
  Activity, Loader2, UserPlus, LockKeyhole, Mail, User, 
  Eye, EyeOff, Shield, Heart, Stethoscope, Pill, 
  CheckCircle2, AlertTriangle, Building2, Phone, BriefcaseMedical 
} from "lucide-react";
import { Alert, AlertDescription } from "@medsync/ui";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.05 } },
};

const ROLES = [
  { value: "PATIENT", label: "Patient", description: "Manage health records & appointments", icon: Heart, accent: "blue" },
  { value: "DOCTOR", label: "Doctor", description: "Prescribe, diagnose & clinical AI", icon: Stethoscope, accent: "emerald" },
  { value: "PHARMACY", label: "Pharmacy", description: "Inventory & prescription fulfillment", icon: Pill, accent: "amber" },
] as const;

const accentMap: Record<string, { border: string; bg: string; text: string; ring: string }> = {
  blue:    { border: "border-blue-500/50",    bg: "bg-blue-500/10",    text: "text-blue-500",    ring: "ring-blue-500/20" },
  emerald: { border: "border-emerald-500/50", bg: "bg-emerald-500/10", text: "text-emerald-500", ring: "ring-emerald-500/20" },
  amber:   { border: "border-amber-500/50",   bg: "bg-amber-500/10",   text: "text-amber-500",   ring: "ring-amber-500/20" },
};

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
  if (score <= 3) return { score: 3, label: "Good", color: "bg-blue-500" };
  return { score: 4, label: "Strong", color: "bg-emerald-500" };
}

export default function RegisterPage() {
  const router = useRouter();
  
  // Base fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("PATIENT");
  
  // Additional fields for Doctor & Pharmacy
  const [licenseNumber, setLicenseNumber] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    // Role specific validation
    if (role === "DOCTOR" && !licenseNumber) {
      setError("Medical License Number is required for doctors.");
      return;
    }
    if (role === "PHARMACY" && (!businessName || !licenseNumber || !contactNumber)) {
      setError("Business Name, License Number, and Contact Number are required for pharmacies.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.register({
        full_name: fullName,
        email,
        password,
        role,
        license_number: role !== "PATIENT" ? licenseNumber : undefined,
        hospital_name: role === "DOCTOR" ? hospitalName : undefined,
        business_name: role === "PHARMACY" ? businessName : undefined,
        contact_number: role === "PHARMACY" ? contactNumber : undefined,
      });

      if (response.data?.needsEmailVerification) {
        router.push("/login?registered=true&verification=true");
        return;
      }

      router.push("/login?registered=true");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0]?.msg || "Validation error");
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError(err.response?.data?.message || err.message || "Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getNamePlaceholder = () => {
    if (role === 'DOCTOR') return "Dr. John Smith";
    if (role === 'PHARMACY') return "Manager/Owner Name";
    return "John Smith";
  };

  const selectedRole = ROLES.find(r => r.value === role);
  const selectedAccent = selectedRole ? accentMap[selectedRole.accent] : accentMap.blue;

  return (
    <div className="flex min-h-screen">

      {/* ─── Left Panel — Illustration ─── */}
      <div className="hidden lg:flex w-5/12 bg-muted/30 dark:bg-muted/10 relative overflow-hidden items-center justify-center border-r border-border/60">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-md">
          {/* Floating composition (matching login/landing page style) */}
          <div className="relative h-56 w-56 mb-10" aria-hidden="true">
            {/* Connecting lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 224 224" fill="none">
              <line x1="112" y1="112" x2="30" y2="10" className="stroke-border/60 dark:stroke-white/[0.06]" strokeWidth="1.5" />
              <line x1="112" y1="112" x2="200" y2="20" className="stroke-border/60 dark:stroke-white/[0.06]" strokeWidth="1.5" />
              <line x1="112" y1="112" x2="20" y2="180" className="stroke-border/60 dark:stroke-white/[0.06]" strokeWidth="1.5" />
              <line x1="112" y1="112" x2="190" y2="200" className="stroke-border/60 dark:stroke-white/[0.06]" strokeWidth="1.5" />
            </svg>

            <div className="absolute inset-0 flex items-center justify-center z-10 group cursor-default">
              <div className="relative h-24 w-24 rounded-3xl bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border border-border/50 dark:border-white/[0.08] shadow-2xl flex items-center justify-center overflow-hidden animate-float-slow transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
                <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10" />
                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/10 to-transparent blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                <UserPlus className="h-10 w-10 text-blue-500 relative z-10" strokeWidth={1.5} />
              </div>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap z-20 shadow-xl">
                Create Profile
              </div>
            </div>
            
            <div className="absolute top-0 right-1 animate-float-slow-reverse group cursor-default z-10">
              <div className="h-11 w-11 rounded-[14px] bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md border border-border/50 dark:border-white/[0.08] flex items-center justify-center shadow-lg transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
                <Shield className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
              </div>
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl">
                Secure Network
              </div>
            </div>
            <div className="absolute bottom-2 left-0 animate-float-slow group cursor-default z-10" style={{ animationDelay: "1s" }}>
              <div className="h-10 w-10 rounded-[14px] bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md border border-border/50 dark:border-white/[0.08] flex items-center justify-center shadow-lg transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
                <Activity className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
              </div>
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl">
                Health Insights
              </div>
            </div>
            <div className="absolute bottom-6 right-0 animate-float-slow-reverse group cursor-default z-10" style={{ animationDelay: "2s" }}>
              <div className="h-9 w-9 rounded-[12px] bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md border border-border/50 dark:border-white/[0.08] flex items-center justify-center shadow-lg transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
                <Heart className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
              </div>
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl">
                Patient Care
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3">
            Join the Network of Trust
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Create your account to access AI-powered diagnostics, secure records, and connected healthcare.
          </p>
        </div>
      </div>

      {/* ─── Right Panel — Register Form ─── */}
      <div className="flex w-full lg:w-7/12 flex-col justify-center bg-background px-6 py-8 sm:px-12 lg:px-16 xl:px-24 overflow-y-auto">
        <motion.div
          className="mx-auto w-full max-w-[480px]"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Logo */}
          <motion.div variants={fadeUp}>
            <Link href="/" className="inline-flex items-center gap-2 mb-8 group" aria-label="MedSync Home">
              <Activity className="h-5 w-5 text-blue-500" />
              <span className="text-lg font-semibold tracking-tight text-foreground">MedSync</span>
            </Link>
          </motion.div>

          {/* Heading */}
          <motion.div variants={fadeUp} className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Create Your MedSync Account</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Join the next generation of secure digital healthcare.
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleRegister}>
            <motion.div variants={stagger} className="space-y-5">
              {/* Error */}
              {error && (
                <motion.div variants={fadeUp}>
                  <Alert variant="destructive" className="py-3 bg-destructive/10 text-destructive border-destructive/20">
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {/* Role Selection Cards */}
              <motion.div variants={fadeUp} className="space-y-2.5">
                <label className="text-sm font-medium text-foreground/80">Account Type</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {ROLES.map((r) => {
                    const accent = accentMap[r.accent];
                    const isSelected = role === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => {
                          setRole(r.value);
                          setError("");
                        }}
                        disabled={isLoading}
                        className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-200 ${
                          isSelected
                            ? `${accent.border} ${accent.bg} ring-1 ${accent.ring}`
                            : "border-input hover:border-muted-foreground/30 hover:bg-muted/30"
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected ? `${accent.bg} ${accent.text}` : "bg-muted text-muted-foreground"
                        }`}>
                          <r.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className={`text-xs font-semibold ${isSelected ? accent.text : "text-foreground"}`}>{r.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{r.description}</p>
                        </div>
                        {isSelected && (
                          <div className={`absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center ${accent.text.replace("text-", "bg-")}`}>
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <motion.div variants={fadeUp} className="space-y-2">
                  <label htmlFor="fullName" className="text-sm font-medium text-foreground/80">
                    {role === 'PHARMACY' ? 'Manager Name' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder={getNamePlaceholder()}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="name"
                      className="h-12 pl-10 pr-4 bg-background border-input hover:border-muted-foreground/30 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all duration-200"
                    />
                  </div>
                </motion.div>

                {/* Email */}
                <motion.div variants={fadeUp} className="space-y-2">
                  <label htmlFor="regEmail" className="text-sm font-medium text-foreground/80">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                    <Input
                      id="regEmail"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                      className="h-12 pl-10 pr-4 bg-background border-input hover:border-muted-foreground/30 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all duration-200"
                    />
                  </div>
                </motion.div>
              </div>

              {/* Dynamic Role Fields */}
              <AnimatePresence mode="popLayout">
                {role === "DOCTOR" && (
                  <motion.div
                    key="doctor-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-hidden"
                  >
                    <div className="space-y-2 pt-1">
                      <label htmlFor="license" className="text-sm font-medium text-foreground/80">Medical License No.</label>
                      <div className="relative">
                        <BriefcaseMedical className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                        <Input
                          id="license"
                          type="text"
                          placeholder="Registration number"
                          value={licenseNumber}
                          onChange={(e) => setLicenseNumber(e.target.value)}
                          required
                          disabled={isLoading}
                          className="h-12 pl-10 pr-4 bg-background border-input hover:border-muted-foreground/30 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 pt-1">
                      <label htmlFor="hospital" className="text-sm font-medium text-foreground/80">Hospital/Clinic Name <span className="text-muted-foreground font-normal">(Optional)</span></label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                        <Input
                          id="hospital"
                          type="text"
                          placeholder="Where you practice"
                          value={hospitalName}
                          onChange={(e) => setHospitalName(e.target.value)}
                          disabled={isLoading}
                          className="h-12 pl-10 pr-4 bg-background border-input hover:border-muted-foreground/30 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {role === "PHARMACY" && (
                  <motion.div
                    key="pharmacy-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-5 overflow-hidden pt-1"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label htmlFor="business" className="text-sm font-medium text-foreground/80">Business Name</label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                          <Input
                            id="business"
                            type="text"
                            placeholder="Pharmacy store name"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            required
                            disabled={isLoading}
                            className="h-12 pl-10 pr-4 bg-background border-input hover:border-muted-foreground/30 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="pharmaLicense" className="text-sm font-medium text-foreground/80">Pharmacy License No.</label>
                        <div className="relative">
                          <BriefcaseMedical className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                          <Input
                            id="pharmaLicense"
                            type="text"
                            placeholder="License/Registration"
                            value={licenseNumber}
                            onChange={(e) => setLicenseNumber(e.target.value)}
                            required
                            disabled={isLoading}
                            className="h-12 pl-10 pr-4 bg-background border-input hover:border-muted-foreground/30 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="contact" className="text-sm font-medium text-foreground/80">Contact Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                        <Input
                          id="contact"
                          type="tel"
                          placeholder="Store contact number"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                          required
                          disabled={isLoading}
                          className="h-12 pl-10 pr-4 bg-background border-input hover:border-muted-foreground/30 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                {/* Password */}
                <motion.div variants={fadeUp} className="space-y-2">
                  <label htmlFor="regPassword" className="text-sm font-medium text-foreground/80">Password</label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                    <Input
                      id="regPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                      className="h-12 pl-10 pr-12 bg-background border-input hover:border-muted-foreground/30 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {password.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                              level <= passwordStrength.score ? passwordStrength.color : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-[11px] font-medium ${passwordStrength.color.replace("bg-", "text-")}`}>
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* Confirm Password */}
                <motion.div variants={fadeUp} className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/80">Confirm Password</label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                      className={`h-12 pl-10 pr-12 bg-background border-input hover:border-muted-foreground/30 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all duration-200 ${
                        passwordsMatch ? "border-emerald-500/50" : passwordsMismatch ? "border-red-500/50" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-3.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordsMatch && (
                    <p className="text-[11px] font-medium text-emerald-500 flex items-center gap-1 pt-1">
                      <CheckCircle2 className="h-3 w-3" /> Passwords match
                    </p>
                  )}
                  {passwordsMismatch && (
                    <p className="text-[11px] font-medium text-red-500 flex items-center gap-1 pt-1">
                      <AlertTriangle className="h-3 w-3" /> Passwords do not match
                    </p>
                  )}
                </motion.div>
              </div>

              {/* Submit */}
              <motion.div variants={fadeUp} className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all duration-200 group"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Create Account
                      <UserPlus className="ml-2 h-4 w-4 transition-transform group-hover:scale-105" />
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </form>

          {/* Verification notice */}
          {(role === "DOCTOR" || role === "PHARMACY") && (
            <motion.div
              variants={fadeUp}
              className="mt-5 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-500 leading-relaxed"
            >
              <strong className="block mb-1 font-semibold text-[10px] uppercase tracking-wider">Verification Required</strong>
              Doctor and Pharmacy accounts require admin verification before full platform access.
            </motion.div>
          )}

          {/* Secure indicator */}
          <motion.div variants={fadeUp} className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
            <Shield className="h-3 w-3" />
            <span>Secured with end-to-end encryption</span>
          </motion.div>

          {/* Sign in link */}
          <motion.p variants={fadeUp} className="mt-6 text-center text-sm text-muted-foreground pb-6">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-blue-500 hover:text-blue-400 transition-colors">
              Sign in
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
