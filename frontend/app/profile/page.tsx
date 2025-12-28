"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";

interface UserProfileData {
  phoneNumber?: string;
  country?: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  currentJobTitle?: string;
  yearsOfExperience?: number;
  professionalSummary?: string;
  highestDegree?: string;
  fieldOfStudy?: string;
  university?: string;
  graduationYear?: number;
  workExperience?: string;
  technicalSkills?: string;
  softSkills?: string;
  certifications?: string;
  keyAchievements?: string;
  notableProjects?: string;
  targetRoles?: string;
  industriesOfInterest?: string;
  workPreference?: string;
  currency?: string;
  salaryExpectation?: string;
  languagesSpoken?: string;
  availability?: string;
  noticePeriod?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<UserProfileData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["personal"])
  );
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [githubConnectedAt, setGithubConnectedAt] = useState<string | null>(null);
  const [githubConnecting, setGithubConnecting] = useState(false);
  const [coverLetterFileName, setCoverLetterFileName] = useState<string | null>(null);
  const [coldEmailFileName, setColdEmailFileName] = useState<string | null>(null);
  const [uploadingCoverLetter, setUploadingCoverLetter] = useState(false);
  const [uploadingColdEmail, setUploadingColdEmail] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchProfile();

    // Handle GitHub OAuth callback
    const params = new URLSearchParams(window.location.search);
    const githubTempToken = params.get('github_temp_token');
    const githubError = params.get('github_error');

    if (githubTempToken) {
      linkGithubAccount(githubTempToken);
      // Clean URL
      window.history.replaceState({}, '', '/profile');
    } else if (githubError) {
      alert(`GitHub connection failed: ${githubError}`);
      window.history.replaceState({}, '', '/profile');
    }
  }, [router]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setFormData(data.profile);
        }
        if (data.github) {
          setGithubUsername(data.github.githubUsername);
          setGithubConnectedAt(data.github.githubConnectedAt);
        }
        if (data.coverLetterFileName) {
          setCoverLetterFileName(data.coverLetterFileName);
        }
        if (data.coldEmailFileName) {
          setColdEmailFileName(data.coldEmailFileName);
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFillFromResume = async () => {
    setAutoFilling(true);
    try {
      const token = localStorage.getItem("access_token");

      // First, get the resume
      const resumeResponse = await fetch("/api/resume/get", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resumeResponse.ok) {
        alert("No resume found. Please upload your resume first from the header menu.");
        return;
      }

      const resumeData = await resumeResponse.json();

      // Parse the resume using AI
      const parseResponse = await fetch("/api/resume/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeContent: resumeData.resume.content,
          mimeType: resumeData.resume.mimeType,
        }),
      });

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json();
        throw new Error(errorData.error || errorData.message || "Failed to parse resume");
      }

      const parsedData = await parseResponse.json();

      if (!parsedData.profile || Object.keys(parsedData.profile).length === 0) {
        alert("⚠️ Warning: No data could be extracted from your resume. Please check if the resume is readable and try again, or fill the profile manually.");
        return;
      }

      // Merge parsed data with existing form data
      setFormData(prev => ({
        ...prev,
        ...parsedData.profile,
      }));

      const fieldsCount = Object.keys(parsedData.profile).length;
      alert(`✅ Profile auto-filled successfully!\n\n${fieldsCount} fields extracted from your resume.\n\nPlease review the information and save.`);
    } catch (error) {
      console.error("Auto-fill error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      alert(`❌ Auto-fill failed!\n\nError: ${errorMessage}\n\nPlease check:\n1. Resume is uploaded and readable\n2. Resume is not password-protected\n3. Browser console for detailed errors\n\nOr fill the profile manually.`);
    } finally {
      setAutoFilling(false);
    }
  };

  const linkGithubAccount = async (tempToken: string) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/auth/github/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ githubTempToken: tempToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setGithubUsername(data.githubUsername);
        setGithubConnectedAt(data.githubConnectedAt);
        alert("GitHub account connected successfully!");
      } else {
        const error = await response.json();
        alert(`Failed to connect GitHub: ${error.message}`);
      }
    } catch (error) {
      console.error("Link GitHub error:", error);
      alert("Failed to connect GitHub account");
    }
  };

  const handleConnectGithub = () => {
    setGithubConnecting(true);
    window.location.href = "/api/auth/github";
  };

  const handleDisconnectGithub = async () => {
    if (!confirm("Are you sure you want to disconnect your GitHub account?")) {
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/auth/github/disconnect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setGithubUsername(null);
        setGithubConnectedAt(null);
        alert("GitHub account disconnected successfully!");
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      console.error("Disconnect GitHub error:", error);
      alert("Failed to disconnect GitHub account");
    }
  };

  const handleCoverLetterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "text/plain"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or TXT file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploadingCoverLetter(true);
    try {
      const formData = new FormData();
      formData.append("coverLetter", file);

      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/cover-letter/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      alert("Demo cover letter uploaded successfully!");
      await fetchProfile();
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload cover letter. Please try again.");
    } finally {
      setUploadingCoverLetter(false);
    }
  };

  const handleColdEmailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "text/plain"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or TXT file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploadingColdEmail(true);
    try {
      const formData = new FormData();
      formData.append("coldEmail", file);

      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/cold-email/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      alert("Demo cold email uploaded successfully!");
      await fetchProfile();
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload cold email. Please try again.");
    } finally {
      setUploadingColdEmail(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Profile saved successfully!");
      } else {
        throw new Error("Failed to save profile");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleChange = (
    field: keyof UserProfileData,
    value: string | number
  ) => {
    setFormData({ ...formData, [field]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Matrix-style grid background */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(0, 255, 65, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.03) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>

        <Header />
        <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mb-4"></div>
            <p className="text-cyan-400 font-mono font-bold">LOADING PROFILE<span className="animate-pulse">...</span></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Matrix-style grid background */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(0, 255, 65, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.03) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}></div>

      {/* Animated neon orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-emerald-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 65, 0.1) 2px, rgba(0, 255, 65, 0.1) 4px)'
        }}></div>
      </div>

      <Header />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black font-mono text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]">
                {'<'} USER PROFILE {'>'}
              </h1>
              <p className="text-emerald-300 font-mono mt-2 text-sm">
                // Complete your profile to generate better content
              </p>
            </div>

            {/* Auto-fill Button - Commented out as per user request */}
            {/* <button
              onClick={handleAutoFillFromResume}
              disabled={autoFilling}
              className="group px-6 py-3 bg-linear-to-r from-fuchsia-500 to-cyan-500 text-black font-mono font-black uppercase tracking-wider shadow-lg shadow-fuchsia-500/50 hover:shadow-fuchsia-500/80 transition-all duration-300 transform hover:scale-105 border-2 border-fuchsia-400 hover:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {autoFilling ? "AUTO-FILLING..." : "AUTO-FILL FROM RESUME"}
              </span>
            </button> */}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20">
          {/* Form Sections */}
          <div className="p-6 space-y-4">
            {/* Personal Information Section */}
            <Section
              title="PERSONAL INFORMATION"
              icon="👤"
              isExpanded={expandedSections.has("personal")}
              onToggle={() => toggleSection("personal")}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  value={formData.phoneNumber || ""}
                  onChange={(v) => handleChange("phoneNumber", v)}
                  placeholder="+1 (555) 123-4567"
                />
                <Select
                  label="Country"
                  value={formData.country || ""}
                  onChange={(v) => handleChange("country", v)}
                  options={[
                    { value: "", label: "Select country" },
                    { value: "US", label: "United States" },
                    { value: "CA", label: "Canada" },
                    { value: "GB", label: "United Kingdom" },
                    { value: "AU", label: "Australia" },
                    { value: "DE", label: "Germany" },
                    { value: "FR", label: "France" },
                    { value: "IN", label: "India" },
                    { value: "CN", label: "China" },
                    { value: "JP", label: "Japan" },
                    { value: "BR", label: "Brazil" },
                    { value: "MX", label: "Mexico" },
                    { value: "ES", label: "Spain" },
                    { value: "IT", label: "Italy" },
                    { value: "NL", label: "Netherlands" },
                    { value: "SE", label: "Sweden" },
                    { value: "SG", label: "Singapore" },
                    { value: "OTHER", label: "Other" },
                  ]}
                />
                <Input
                  label="Location"
                  value={formData.location || ""}
                  onChange={(v) => handleChange("location", v)}
                  placeholder="San Francisco, CA"
                />
                <Input
                  label="LinkedIn URL"
                  value={formData.linkedinUrl || ""}
                  onChange={(v) => handleChange("linkedinUrl", v)}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
                <Input
                  label="Portfolio URL"
                  value={formData.portfolioUrl || ""}
                  onChange={(v) => handleChange("portfolioUrl", v)}
                  placeholder="https://yourportfolio.com"
                />
                <Input
                  label="GitHub URL"
                  value={formData.githubUrl || ""}
                  onChange={(v) => handleChange("githubUrl", v)}
                  placeholder="https://github.com/yourusername"
                />
              </div>
            </Section>

            {/* Professional Information Section */}
            <Section
              title="PROFESSIONAL INFORMATION"
              icon="💼"
              isExpanded={expandedSections.has("professional")}
              onToggle={() => toggleSection("professional")}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Current Job Title"
                    value={formData.currentJobTitle || ""}
                    onChange={(v) => handleChange("currentJobTitle", v)}
                    placeholder="Senior Software Engineer"
                  />
                  <Input
                    label="Total Years of Experience"
                    type="number"
                    step="0.1"
                    value={formData.yearsOfExperience?.toString() || ""}
                    onChange={(v) =>
                      handleChange("yearsOfExperience", parseFloat(v) || 0)
                    }
                    placeholder="5 or 1.5"
                  />
                </div>
                <Textarea
                  label="Professional Summary"
                  value={formData.professionalSummary || ""}
                  onChange={(v) => handleChange("professionalSummary", v)}
                  placeholder="Brief summary of your professional background, expertise, and career highlights..."
                  rows={4}
                />
              </div>
            </Section>

            {/* Education Section */}
            <Section
              title="EDUCATION"
              icon="🎓"
              isExpanded={expandedSections.has("education")}
              onToggle={() => toggleSection("education")}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Highest Degree"
                  value={formData.highestDegree || ""}
                  onChange={(v) => handleChange("highestDegree", v)}
                  placeholder="Bachelor's, Master's, PhD"
                />
                <Input
                  label="Field of Study"
                  value={formData.fieldOfStudy || ""}
                  onChange={(v) => handleChange("fieldOfStudy", v)}
                  placeholder="Computer Science"
                />
                <Input
                  label="University"
                  value={formData.university || ""}
                  onChange={(v) => handleChange("university", v)}
                  placeholder="Stanford University"
                />
                <Input
                  label="Graduation Year"
                  type="number"
                  value={formData.graduationYear?.toString() || ""}
                  onChange={(v) =>
                    handleChange("graduationYear", parseInt(v) || 0)
                  }
                  placeholder="2020"
                />
              </div>
            </Section>

            {/* Skills & Expertise Section */}
            <Section
              title="SKILLS & EXPERTISE"
              icon="⚡"
              isExpanded={expandedSections.has("skills")}
              onToggle={() => toggleSection("skills")}
            >
              <div className="space-y-4">
                <Textarea
                  label="Technical Skills"
                  value={formData.technicalSkills || ""}
                  onChange={(v) => handleChange("technicalSkills", v)}
                  placeholder="JavaScript, React, Node.js, Python, AWS, Docker, etc."
                  rows={3}
                />
                <Textarea
                  label="Soft Skills"
                  value={formData.softSkills || ""}
                  onChange={(v) => handleChange("softSkills", v)}
                  placeholder="Leadership, Communication, Problem-solving, Team collaboration, etc."
                  rows={2}
                />
                <Textarea
                  label="Certifications"
                  value={formData.certifications || ""}
                  onChange={(v) => handleChange("certifications", v)}
                  placeholder="AWS Certified Solutions Architect, Google Cloud Professional, etc."
                  rows={2}
                />
              </div>
            </Section>

            {/* Work Experience Section */}
            <Section
              title="WORK EXPERIENCE"
              icon="🏢"
              isExpanded={expandedSections.has("experience")}
              onToggle={() => toggleSection("experience")}
            >
              <Textarea
                label="Previous Roles & Companies"
                value={formData.workExperience || ""}
                onChange={(v) => handleChange("workExperience", v)}
                placeholder="Senior Engineer at Google (2020-2023)&#10;Software Engineer at Microsoft (2018-2020)&#10;etc."
                rows={6}
              />
            </Section>

            {/* Achievements & Projects Section */}
            <Section
              title="ACHIEVEMENTS & PROJECTS"
              icon="🏆"
              isExpanded={expandedSections.has("achievements")}
              onToggle={() => toggleSection("achievements")}
            >
              <div className="space-y-4">
                <Textarea
                  label="Key Achievements"
                  value={formData.keyAchievements || ""}
                  onChange={(v) => handleChange("keyAchievements", v)}
                  placeholder="Led team of 10 engineers, Increased performance by 40%, Built system serving 1M users, etc."
                  rows={4}
                />
                <Textarea
                  label="Notable Projects"
                  value={formData.notableProjects || ""}
                  onChange={(v) => handleChange("notableProjects", v)}
                  placeholder="E-commerce platform with AI recommendations, Real-time analytics dashboard, etc."
                  rows={4}
                />
              </div>
            </Section>

            {/* Career Preferences Section */}
            <Section
              title="CAREER PREFERENCES"
              icon="🎯"
              isExpanded={expandedSections.has("preferences")}
              onToggle={() => toggleSection("preferences")}
            >
              <div className="space-y-4">
                <Textarea
                  label="Target Roles"
                  value={formData.targetRoles || ""}
                  onChange={(v) => handleChange("targetRoles", v)}
                  placeholder="Senior Software Engineer, Tech Lead, Engineering Manager, etc."
                  rows={2}
                />
                <Textarea
                  label="Industries of Interest"
                  value={formData.industriesOfInterest || ""}
                  onChange={(v) => handleChange("industriesOfInterest", v)}
                  placeholder="FinTech, HealthTech, AI/ML, E-commerce, etc."
                  rows={2}
                />
                <Select
                  label="Work Preference"
                  value={formData.workPreference || ""}
                  onChange={(v) => handleChange("workPreference", v)}
                  options={[
                    { value: "", label: "Select preference" },
                    { value: "remote", label: "Remote" },
                    { value: "on-site", label: "On-site" },
                    { value: "hybrid", label: "Hybrid" },
                  ]}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Currency"
                    value={formData.currency || ""}
                    onChange={(v) => handleChange("currency", v)}
                    options={[
                      { value: "", label: "Select currency" },
                      { value: "USD", label: "USD ($) - US Dollar" },
                      { value: "EUR", label: "EUR (€) - Euro" },
                      { value: "GBP", label: "GBP (£) - British Pound" },
                      { value: "CAD", label: "CAD ($) - Canadian Dollar" },
                      { value: "AUD", label: "AUD ($) - Australian Dollar" },
                      { value: "INR", label: "INR (₹) - Indian Rupee" },
                      { value: "JPY", label: "JPY (¥) - Japanese Yen" },
                      { value: "CNY", label: "CNY (¥) - Chinese Yuan" },
                      { value: "SGD", label: "SGD ($) - Singapore Dollar" },
                      { value: "CHF", label: "CHF (Fr) - Swiss Franc" },
                      { value: "SEK", label: "SEK (kr) - Swedish Krona" },
                      { value: "OTHER", label: "Other" },
                    ]}
                  />
                  <Input
                    label="Salary Expectation"
                    value={formData.salaryExpectation || ""}
                    onChange={(v) => handleChange("salaryExpectation", v)}
                    placeholder="120,000 - 150,000"
                  />
                </div>
              </div>
            </Section>

            {/* Additional Information Section */}
            <Section
              title="ADDITIONAL INFORMATION"
              icon="📋"
              isExpanded={expandedSections.has("additional")}
              onToggle={() => toggleSection("additional")}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Languages Spoken"
                  value={formData.languagesSpoken || ""}
                  onChange={(v) => handleChange("languagesSpoken", v)}
                  placeholder="English, Spanish"
                />
                <Input
                  label="Availability"
                  value={formData.availability || ""}
                  onChange={(v) => handleChange("availability", v)}
                  placeholder="Immediately / 2 weeks"
                />
                <Input
                  label="Notice Period"
                  value={formData.noticePeriod || ""}
                  onChange={(v) => handleChange("noticePeriod", v)}
                  placeholder="2 weeks / 1 month"
                />
              </div>
            </Section>

            {/* GitHub Integration Section */}
            <Section
              title="GITHUB INTEGRATION"
              icon="💻"
              isExpanded={expandedSections.has("github")}
              onToggle={() => toggleSection("github")}
            >
              <div className="space-y-4">
                {githubUsername ? (
                  <div className="bg-emerald-500/10 border-2 border-emerald-500/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center border-2 border-emerald-400">
                          <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-400 font-mono">
                            {'>'} CONNECTED: <span className="text-cyan-400">{githubUsername}</span>
                          </p>
                          {githubConnectedAt && (
                            <p className="text-xs text-emerald-300/60 font-mono">
                              // {new Date(githubConnectedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleDisconnectGithub}
                        className="px-4 py-2 border-2 border-red-500/50 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-mono font-bold uppercase"
                      >
                        DISCONNECT
                      </button>
                    </div>
                    <div className="mt-3 text-sm text-emerald-300/80 font-mono">
                      // Your repositories will enhance your resume generation
                    </div>
                  </div>
                ) : (
                  <div className="bg-cyan-500/10 border-2 border-cyan-500/50 p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-linear-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shrink-0 border-2 border-cyan-400">
                        <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-black text-cyan-400 mb-1 font-mono uppercase">
                          {'>'} Connect GitHub Account
                        </h4>
                        <p className="text-sm text-emerald-300/80 mb-3 font-mono">
                          // Auto-import repos and tech stack for better content
                        </p>
                        <button
                          onClick={handleConnectGithub}
                          disabled={githubConnecting}
                          className="px-4 py-2 bg-linear-to-r from-cyan-500 to-fuchsia-500 text-black border-2 border-cyan-400 hover:from-fuchsia-500 hover:to-cyan-500 transition-colors font-mono font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm shadow-lg shadow-cyan-500/50"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                          </svg>
                          <span>{githubConnecting ? "CONNECTING..." : "CONNECT GITHUB"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* Demo Cover Letter Upload Section */}
            <Section
              title="DEMO COVER LETTER (OPTIONAL)"
              icon="📝"
              isExpanded={expandedSections.has("coverLetter")}
              onToggle={() => toggleSection("coverLetter")}
            >
              <div className="space-y-4">
                <p className="text-sm text-emerald-300/80 font-mono">
                  // Upload a sample to help AI understand your writing style
                </p>
                {coverLetterFileName ? (
                  <div className="bg-emerald-500/10 border-2 border-emerald-500/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-bold text-cyan-400 font-mono">{coverLetterFileName}</span>
                      </div>
                      <label className="px-4 py-2 border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 transition-colors text-sm font-mono font-bold uppercase cursor-pointer">
                        {uploadingCoverLetter ? "UPLOADING..." : "UPDATE"}
                        <input
                          type="file"
                          accept=".pdf,.txt"
                          onChange={handleCoverLetterUpload}
                          disabled={uploadingCoverLetter}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="block">
                    <div className="border-2 border-dashed border-cyan-500/30 p-6 text-center hover:border-cyan-500 transition-colors cursor-pointer bg-black/40">
                      <svg className="mx-auto h-12 w-12 text-cyan-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mt-2 text-sm text-cyan-400 font-mono font-bold">
                        {uploadingCoverLetter ? "UPLOADING..." : "CLICK TO UPLOAD"}
                      </p>
                      <p className="text-xs text-emerald-300/60 font-mono mt-1">// PDF or TXT (Max 5MB)</p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleCoverLetterUpload}
                      disabled={uploadingCoverLetter}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </Section>

            {/* Demo Cold Email Upload Section */}
            <Section
              title="DEMO COLD EMAIL (OPTIONAL)"
              icon="✉️"
              isExpanded={expandedSections.has("coldEmail")}
              onToggle={() => toggleSection("coldEmail")}
            >
              <div className="space-y-4">
                <p className="text-sm text-emerald-300/80 font-mono">
                  // Upload a sample to help AI learn your communication style
                </p>
                {coldEmailFileName ? (
                  <div className="bg-emerald-500/10 border-2 border-emerald-500/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-bold text-cyan-400 font-mono">{coldEmailFileName}</span>
                      </div>
                      <label className="px-4 py-2 border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 transition-colors text-sm font-mono font-bold uppercase cursor-pointer">
                        {uploadingColdEmail ? "UPLOADING..." : "UPDATE"}
                        <input
                          type="file"
                          accept=".pdf,.txt"
                          onChange={handleColdEmailUpload}
                          disabled={uploadingColdEmail}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="block">
                    <div className="border-2 border-dashed border-cyan-500/30 p-6 text-center hover:border-cyan-500 transition-colors cursor-pointer bg-black/40">
                      <svg className="mx-auto h-12 w-12 text-cyan-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mt-2 text-sm text-cyan-400 font-mono font-bold">
                        {uploadingColdEmail ? "UPLOADING..." : "CLICK TO UPLOAD"}
                      </p>
                      <p className="text-xs text-emerald-300/60 font-mono mt-1">// PDF or TXT (Max 5MB)</p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleColdEmailUpload}
                      disabled={uploadingColdEmail}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </Section>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t-2 border-cyan-500/30">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 border-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer font-mono font-bold uppercase tracking-wide"
            >
              {'<'} CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-linear-to-r from-cyan-500 to-fuchsia-500 text-black border-2 border-cyan-400 hover:from-fuchsia-500 hover:to-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-mono font-black uppercase tracking-wide shadow-lg shadow-cyan-500/50"
            >
              {saving ? "SAVING..." : "SAVE PROFILE >"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function Section({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-2 border-cyan-500/30 bg-black/40 hover:border-cyan-500/50 transition-colors">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-4 hover:bg-cyan-500/5 transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
          <h3 className="text-lg font-black text-cyan-400 font-mono uppercase tracking-wide">
            {'>'} {title}
          </h3>
        </div>
        <svg
          className={`w-5 h-5 text-emerald-400 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isExpanded && <div className="p-4 pt-0 border-t border-cyan-500/20">{children}</div>}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-emerald-400 mb-2 font-mono uppercase tracking-wide">
        {'>'} {label}
      </label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border-2 border-cyan-500/30 bg-black/60 text-cyan-300 focus:border-cyan-500 focus:outline-none transition-colors cursor-text font-mono placeholder-emerald-300/30"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-emerald-400 mb-2 font-mono uppercase tracking-wide">
        {'>'} {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-2 border-2 border-cyan-500/30 bg-black/60 text-cyan-300 focus:border-cyan-500 focus:outline-none transition-colors resize-none cursor-text font-mono placeholder-emerald-300/30"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-emerald-400 mb-2 font-mono uppercase tracking-wide">
        {'>'} {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border-2 border-cyan-500/30 bg-black/60 text-cyan-300 focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer font-mono"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-black text-cyan-300">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
