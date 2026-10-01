import RootDiv from "@/components/rootdiv"
import { useEffect, useState } from "react"
import jsonData from "../../../../package.json"
import { invoke } from "@/lib/electron"
import Button from "@/components/ui/button"
import Modal from "@/components/ui/modal"
import ChangelogModal from "@/components/changelogModal"
import Toggle from "@/components/ui/Toggle"
import { toast } from "react-toastify"
import Card from "@/components/ui/Card"
import { Dropdown } from "@/components/ui/dropdown"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { applyLanguage, LANGUAGE_STORAGE_KEY } from "@/i18n"

const themes = [
  { label: "System", value: "system" },
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" },
  { label: "Purple", value: "purple" },
  { label: "Gray", value: "gray" },
  { label: "Classic", value: "classic" },
]

function Settings() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "system")
  const [animationDirection, setAnimationDirection] = useState<"up" | "left" | "off">(
    (localStorage.getItem("pageAnimation") as "up" | "left" | "off") || "up",
  )
  const [languageChoice, setLanguageChoice] = useState(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored === "en" || stored === "zh-CN") return stored
    return "auto"
  })
  const [checking, setChecking] = useState(false)
  const [trayEnabled, setTrayEnabled] = useState(true)
  const [trayLoading, setTrayLoading] = useState(false)
  const [posthogDisabled, setPosthogDisabled] = useState(() => {
    return localStorage.getItem("posthogDisabled") === "true"
  })
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [forceLocalApps, setForceLocalApps] = useState(() => {
    return localStorage.getItem("forceLocalApps") === "true"
  })
  const [defaultPackageManager, setDefaultPackageManager] = useState<"Chocolatey" | "Winget">(
    (localStorage.getItem("defaultPackageManager") as "Chocolatey" | "Winget") || "Winget",
  )
  const [hideAppIcons, setHideAppIcons] = useState<boolean>(
    localStorage.getItem("hideAppsPageAppIcons") === "true",
  )
  const [rpcEnabled, setRpcEnabled] = useState(true)
  const [rpcLoading, setRpcLoading] = useState(false)
  const checkForUpdates = async () => {
    try {
      setChecking(true)
      const res = await invoke({ channel: "updater:check" })
      if (res?.ok && !res.updateInfo) {
        toast.success(t("You're up to date"))
      } else if (res?.updateInfo) {
        toast.info(t("Update available: {{version}}", { version: res.updateInfo.version }))
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    document.body.classList.remove("light", "purple", "dark", "gray", "classic")
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      document.body.classList.add(systemTheme)
    } else if (theme) {
      document.body.classList.add(theme)
    } else {
      document.body.classList.add("dark")
    }
    localStorage.setItem("theme", theme || "dark")
  }, [theme])

  useEffect(() => {
    invoke({ channel: "tray:get" }).then((status) => setTrayEnabled(status))
  }, [])

  useEffect(() => {
    invoke({ channel: "rpc-enabled:get" }).then((status) => setRpcEnabled(status))
  }, [])

  useEffect(() => {
    if (posthogDisabled) {
      document.body.classList.add("ph-no-capture")
    } else {
      document.body.classList.remove("ph-no-capture")
    }
    localStorage.setItem("posthogDisabled", posthogDisabled.toString())
  }, [posthogDisabled])

  const clearCache = async () => {
    await invoke({ channel: "clear-sparkle-cache" })
    localStorage.removeItem("sparkle:systemInfo")
    localStorage.removeItem("sparkle:tweakInfo")
    toast.success(t("Sparkle cache cleared successfully!"))
  }

  const handleToggleTray = async () => {
    setTrayLoading(true)
    const newStatus = !trayEnabled
    await invoke({ channel: "tray:set", payload: newStatus })
    setTrayEnabled(newStatus)
    setTrayLoading(false)
  }

  const handleToggleRpc = async () => {
    setRpcLoading(true)
    const newStatus = !rpcEnabled
    await invoke({ channel: "rpc-enabled:set", payload: newStatus })
    setRpcEnabled(newStatus)
    setRpcLoading(false)
    toast.success(t("Discord RPC ") + t(newStatus ? "Enabled" : "Disabled"))
  }

  const handleRestartExplorer = async () => {
    try {
      await invoke({ channel: "restart-explorer" })
      toast.success(t("Explorer restarted successfully"))
    } catch (e) {
      toast.error(t("Failed to restart explorer: ") + String(e))
    }
  }

  const languageOptions = [t("Auto"), "English", "中文"]
  const languageValue =
    languageChoice === "auto" ? t("Auto") : languageChoice === "en" ? "English" : "中文"
  const handleLanguageChange = (value) => {
    const choice = value === "English" ? "en" : value === "中文" ? "zh-CN" : "auto"
    setLanguageChoice(choice)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, choice)
    void applyLanguage()
  }

  const animationLabels = { up: t("up"), left: t("left"), off: t("off") }

  return (
    <>
      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <div className="bg-sparkle-card border border-sparkle-border rounded-2xl p-4 shadow-2xl max-w-md w-full mx-4">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-500/20">
                <TriangleAlert className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-sparkle-text">{t("Delete Legacy Backups")}</h2>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed">
              {t("Are you sure you want to delete all legacy registry backups? This will permanently remove the")}{" "}
              <code className="bg-sparkle-border-secondary/20 px-1 py-0.5 rounded-sm text-xs">
                C:\Sparkle\Backup
              </code>{" "}
              {t("folder and all its contents.")}
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteModalOpen(false)
                invoke({ channel: "delete-old-sparkle-backups" })
              }}
            >
              {t("Delete")}
            </Button>
          </div>
        </div>
      </Modal>
      <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} />
      <RootDiv>
        <div className="min-h-screen w-full pb-16 overflow-y-auto">
          <div className="space-y-8 ">
            <SettingSection title={t("Appearance")}>
              <SettingCard>
                <div className="space-y-4">
                  <h3 className="text-base font-medium text-sparkle-text">{t("Theme")}</h3>
                  <div className="grid grid-cols-6 gap-3">
                    {themes.map((th) => (
                      <label
                        key={th.value}
                        className={`flex items-center justify-center gap-2 cursor-pointer p-3 rounded-lg border transition-all duration-200 active:scale-95 ${
                          theme === th.value ? "border-sparkle-primary" : "border-sparkle-border"
                        }`}
                      >
                        <input
                          type="radio"
                          name="theme"
                          value={th.value}
                          checked={theme === th.value}
                          onChange={() => setTheme(th.value)}
                          className="sr-only"
                        />
                        <span className="text-sparkle-text font-medium">{t(th.label)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </SettingCard>
              <SettingCard>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-sparkle-text mb-1">{t("Language")}</h3>
                    <p className="text-sm text-sparkle-text-secondary">
                      {t("Choose the display language. Auto follows your Windows system language.")}
                    </p>
                  </div>
                  <Dropdown
                    value={languageValue}
                    options={languageOptions}
                    onChange={handleLanguageChange}
                  />
                </div>
              </SettingCard>
              <SettingCard>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-sparkle-text mb-1">
                      {t("Animation Direction")}
                    </h3>
                    <p className="text-sm text-sparkle-text-secondary">
                      {t("Choose the page transition animation direction")}
                    </p>
                  </div>
                  <Dropdown
                    value={animationLabels[animationDirection]}
                    options={Object.values(animationLabels)}
                    onChange={(value) => {
                      const entry = Object.entries(animationLabels).find(([, label]) => label === value)
                      const next = entry ? (entry[0] as "up" | "left" | "off") : "up"
                      setAnimationDirection(next)
                      localStorage.setItem("pageAnimation", next)
                    }}
                  />
                </div>
              </SettingCard>
            </SettingSection>

            <SettingSection title={t("Updates")}>
              <SettingCard>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-sparkle-text mb-1">
                      {t("Check for Updates")}
                    </h3>
                    <p className="text-sm text-sparkle-text-secondary">{t("Check for updates")}</p>
                  </div>
                  <Button onClick={checkForUpdates} disabled={checking}>
                    {checking ? t("Checking...") : t("Check for Updates")}
                  </Button>
                </div>
              </SettingCard>
            </SettingSection>
            <SettingSection title={t("Apps Page")}>
              <SettingCard>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-sparkle-text mb-1">
                      {t("Default Package Manager")}
                    </h3>
                    <p className="text-sm text-sparkle-text-secondary">
                      {t("Set the default package manager for installing apps")}
                    </p>
                  </div>
                  <Dropdown
                    value={defaultPackageManager}
                    options={["Winget", "Chocolatey"]}
                    onChange={(value) => {
                      setDefaultPackageManager(value as "Chocolatey" | "Winget")
                      localStorage.setItem("defaultPackageManager", value)
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-sparkle-text mb-1">
                      {t("Hide App Icons on Apps Page")}
                    </h3>
                    <p className="text-sm text-sparkle-text-secondary">
                      {t("Hides the app icons on the apps page, showing only the app names. Reduces network requests and speeds up loading time, especially on slower connections.")}
                    </p>
                  </div>
                  <Toggle
                    checked={hideAppIcons}
                    onChange={() => {
                      setHideAppIcons((v) => {
                        const next = !v
                        localStorage.setItem("hideAppsPageAppIcons", next.toString())
                        toast.success(t("Hide app icons ") + t(next ? "Enabled" : "Disabled"))
                        return next
                      })
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-sparkle-text mb-1">
                      {t("Force Local")}{" "}
                      <code className="bg-sparkle-border rounded-md p-0.5">apps.json</code>
                    </h3>
                    <p className="text-sm text-sparkle-text-secondary">
                      {t("By default, the apps page fetches the latest \"apps.json\" from github. Enabling this option forces it to use the local version of \"apps.json\" which is updated with Sparkle updates.")}
                    </p>
                  </div>
                  <Toggle
                    checked={forceLocalApps}
                    onChange={() => {
                      setForceLocalApps((v) => {
                        const next = !v
                        localStorage.setItem("forceLocalApps", next.toString())
                        toast.success(t("Force local apps.json ") + t(next ? "Enabled" : "Disabled"))
                        return next
                      })
                    }}
                  />
                </div>
              </SettingCard>
            </SettingSection>
            <SettingSection title={t("Profile")}>
              <SettingCard>
                <div className="space-y-4">
                  <h3 className="text-base font-medium text-sparkle-text">{t("User Name")}</h3>
                  <input
                    type="text"
                    defaultValue={localStorage.getItem("sparkle:user") || ""}
                    onChange={(e) => localStorage.setItem("sparkle:user", e.target.value)}
                    className="w-full bg-sparkle-card border border-sparkle-border rounded-lg px-3 py-2 text-sparkle-text focus:ring-0 focus:outline-hidden"
                    placeholder={t("Enter your name")}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const username = await invoke({ channel: "get-user-name" })
                        localStorage.setItem("sparkle:user", username)
                        toast.success(t("Name reset to system user"))
                      }}
                    >
                      {t("Reset to System Name")}
                    </Button>
                  </div>
                </div>
              </SettingCard>
            </SettingSection>

            <SettingSection title={t("Privacy")}>
              <SettingCard>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-sparkle-text mb-1">
                      {t("Disable Analytics")}
                    </h3>
                    <p className="text-sm text-sparkle-text-secondary">
                      {t("Disables Posthog analytics")}
                      <span className="inline-flex items-center gap-1 ml-2 text-yellow-500">
                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                        {t("Requires restart")}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Toggle
                      checked={posthogDisabled}
                      onChange={() => setPosthogDisabled((v) => !v)}
                    />
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        posthogDisabled
                          ? "text-green-400 bg-green-400/10"
                          : "text-sparkle-text-secondary bg-sparkle-border-secondary/20"
                      }`}
                    >
                      {posthogDisabled ? t("Disabled") : t("Enabled")}
                    </span>
                  </div>
                </div>
              </SettingCard>
            </SettingSection>

            <SettingSection title={t("Data Management")}>
              <SettingCard>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-sparkle-text mb-1">{t("Legacy Backups")}</h3>
                    <p className="text-sm text-sparkle-text-secondary">
                      {t("Remove old backup files stored in")}{" "}
                      <code className="bg-sparkle-border-secondary/20 px-1 py-0.5 rounded-sm text-xs">
                        C:\Sparkle\Backup
                      </code>
                    </p>
                  </div>
                  <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
                    {t("Delete Backups")}
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-sparkle-text mb-1">
                      {t("Clear Sparkle Cache")}
                    </h3>
                    <p className="text-sm text-sparkle-text-secondary">
                      {t("Remove temporary files/logs Sparkle may leave behind.")}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={clearCache}>
                    {t("Clear Cache")}
                  </Button>
                  <Button
                    variant="secondary"
                    className="ml-2"
                    onClick={async () => {
                      await invoke({ channel: "open-log-folder" })
                    }}
                  >
                    {t("Open Log Folder")}
                  </Button>
                </div>
              </SettingCard>
            </SettingSection>

            <SettingSection title={t("Other")}>
              <SettingCard>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-sparkle-text mb-1">{t("Show tray icon")}</h3>
                    <p className="text-sm text-sparkle-text-secondary">
                      {t("Enable or disable Sparkle running in the system tray.")}
                      <span className="inline-flex items-center gap-1 ml-2 text-yellow-500">
                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                        {t("Requires restart")}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Toggle
                      checked={trayEnabled}
                      onChange={handleToggleTray}
                      disabled={trayLoading}
                    />
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        trayEnabled
                          ? "text-green-400 bg-green-400/10"
                          : "text-sparkle-text-secondary bg-sparkle-border-secondary/20"
                      }`}
                    >
                      {trayEnabled ? t("Enabled") : t("Disabled")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-sparkle-text mb-1">
                      {t("Discord Rich Presence")}
                    </h3>
                    <p className="text-sm text-sparkle-text-secondary">
                      {t("Show your current Sparkle activity on Discord.")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Toggle checked={rpcEnabled} onChange={handleToggleRpc} disabled={rpcLoading} />
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        rpcEnabled
                          ? "text-green-400 bg-green-400/10"
                          : "text-sparkle-text-secondary bg-sparkle-border-secondary/20"
                      }`}
                    >
                      {rpcEnabled ? t("Enabled") : t("Disabled")}
                    </span>
                  </div>
                </div>
              </SettingCard>
            </SettingSection>

            <SettingSection title={t("Troubleshooting")}>
              <SettingCard>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-sparkle-text mb-1">
                      {t("Restart Explorer")}
                    </h3>
                    <p className="text-sm text-sparkle-text-secondary">
                      {t("Restarts Windows Explorer and Taskbar. Useful if the taskbar disappears.")}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={handleRestartExplorer}>
                    {t("Restart Explorer")}
                  </Button>
                </div>
              </SettingCard>
            </SettingSection>

            <SettingSection title={t("About")}>
              <SettingCard>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium text-sparkle-text mb-1">Sparkle</h3>
                    <p className="text-sm text-sparkle-text-secondary">
                      {t("Version")} {jsonData.version}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={() => setChangelogOpen(true)}>
                      {t("View Changelog")}
                    </Button>
                    <div className="text-right">
                      <p className="text-sm text-sparkle-text-secondary">
                        © {new Date().getFullYear()} Parcoil
                      </p>
                    </div>
                  </div>
                </div>
              </SettingCard>
            </SettingSection>
            <SettingSection title={t("Developer Options")}>
              <p className="text-xs mt-0 text-sparkle-text-secondary">
                {t("It is not recommended to modify these options unless you are a developer or contributor.")}
              </p>
              <SettingCard>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-sparkle-text mb-1">
                      {t("Reset Package Manager Modal")}
                    </h3>
                    <p className="text-sm text-sparkle-text-secondary">
                      {t("Reset the package manager modal located on the apps page to appear on next visit")}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      localStorage.removeItem("hasSeenAppsWelcomeModal")
                      toast.success(t("Package manager modal will be shown on next visit"))
                    }}
                  >
                    {t("Reset Modal")}
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-sparkle-text mb-1">
                      {t("Clear System Info Cache")}
                    </h3>
                    <p className="text-sm text-sparkle-text-secondary">
                      {t("Clear the cached system information.")}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      localStorage.removeItem("sparkle:systemInfo")
                      toast.success(t("System info cache cleared"))
                    }}
                  >
                    {t("Clear Cache")}
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-sparkle-text mb-1">{t("Open Devtools")}</h3>
                    <p className="text-sm text-sparkle-text-secondary">
                      {t("Open the developer tools for debugging. Not recommended for regular users.")}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      invoke({ channel: "open-devtools" })
                    }}
                  >
                    {t("Open Devtools")}
                  </Button>
                </div>
              </SettingCard>
            </SettingSection>
          </div>
        </div>
      </RootDiv>
    </>
  )
}
// this saves alot of time
const SettingCard = ({ children, className = "" }) => (
  <Card className={`p-4 ${className}`}>{children}</Card>
)

const SettingSection = ({ title, children }) => (
  <div className="space-y-4">
    <h2 className="text-xl font-semibold text-sparkle-primary">{title}</h2>
    {children}
  </div>
)
export default Settings
