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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["personal"])
  );
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [githubConnectedAt, setGithubConnectedAt] = useState<string | null>(null);
  const [githubConnecting, setGithubConnecting] = useState(false);

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
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
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
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <p className="text-gray-900 dark:text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Header />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              User Profile Information
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Complete your profile to generate better cover letters and cold emails
            </p>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            {/* Personal Information Section */}
            <Section
              title="Personal Information"
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
                  className="md:col-span-2"
                />
              </div>
            </Section>

            {/* Professional Information Section */}
            <Section
              title="Professional Information"
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
              title="Education"
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
              title="Skills & Expertise"
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
              title="Work Experience"
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
              title="Achievements & Projects"
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
              title="Career Preferences"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                  <Select
                    label="Currency"
                    value={formData.currency || ""}
                    onChange={(v) => handleChange("currency", v)}
                    options={[
                      { value: "", label: "Select currency" },
                      { value: "USD", label: "USD ($) - US Dollar" },
                      { value: "EUR", label: "EUR (\u20ac) - Euro" },
                      { value: "GBP", label: "GBP (\u00a3) - British Pound" },
                      { value: "CAD", label: "CAD ($) - Canadian Dollar" },
                      { value: "AUD", label: "AUD ($) - Australian Dollar" },
                      { value: "INR", label: "INR (\u20b9) - Indian Rupee" },
                      { value: "JPY", label: "JPY (\u00a5) - Japanese Yen" },
                      { value: "CNY", label: "CNY (\u00a5) - Chinese Yuan" },
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
              title="Additional Information"
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
              title="GitHub Integration"
              isExpanded={expandedSections.has("github")}
              onToggle={() => toggleSection("github")}
            >
              <div className="space-y-4">
                {githubUsername ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Connected as <span className="font-bold">{githubUsername}</span>
                          </p>
                          {githubConnectedAt && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Connected on {new Date(githubConnectedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleDisconnectGithub}
                        className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-sm font-medium"
                      >
                        Disconnect
                      </button>
                    </div>
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      Your GitHub repositories will be used to enhance your resume and cover letters with real project data.
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-6 h-6 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                          Connect Your GitHub Account
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                          Automatically import your repositories, projects, and tech stack to generate better resumes and cover letters with real project data.
                        </p>
                        <button
                          onClick={handleConnectGithub}
                          disabled={githubConnecting}
                          className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                          </svg>
                          <span>{githubConnecting ? "Connecting..." : "Connect GitHub"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? "Saving..." : "Save Profile"}
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
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <svg
          className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isExpanded && <div className="p-4 pt-0">{children}</div>}
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
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white cursor-text"
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
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none cursor-text"
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
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
