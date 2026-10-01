import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"
import RootDiv from "@/components/rootdiv"
import { Cpu, HardDrive, Zap, MemoryStick, Gpu } from "lucide-react"
import InfoCard from "@/components/infocard"
import { invoke } from "@/lib/electron"
import Button from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import useSystemStore from "@/store/systemInfo"
import log from "electron-log/renderer"
import Greeting from "@/components/greeting"
import { MonitorCog } from "lucide-react"
import { Wrench } from "lucide-react"
import Card from "@/components/ui/Card"
function Home() {
  const { t } = useTranslation()
  const systemInfo = useSystemStore((state) => state.systemInfo)
  const setSystemInfo = useSystemStore((state) => state.setSystemInfo)
  const [tweakInfo, setTweakInfo] = useState(() => {
    try {
      const cached = localStorage.getItem("sparkle:tweakInfo")
      return cached ? JSON.parse(cached) : null
    } catch (err) {
      console.error("Failed to parse tweakInfo cache", err)
      return null
    }
  })
  const router = useNavigate()
  const [loading, setLoading] = useState(true)
  const [usingCache, setUsingCache] = useState(false)
  const [activeTweaks, setActiveTweaks] = useState(() => {
    try {
      const cached = localStorage.getItem("sparkle:activeTweaks")
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })

  const goToTweaks = () => {
    router("tweaks")
  }

  const fetchActiveTweaks = async () => {
    try {
      const active = await invoke({ channel: "tweak:active" })
      setActiveTweaks(active)
      localStorage.setItem("sparkle:activeTweaks", JSON.stringify(active))
    } catch (err) {
      console.error("Failed to fetch active tweaks:", err)
    }
  }

  useEffect(() => {
    const idleHandle = requestIdleCallback(() => {
      const cached = localStorage.getItem("sparkle:systemInfo")
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          setSystemInfo(parsed)
          setUsingCache(true)
          setLoading(false)
        } catch (err) {
          console.warn("Failed to parse systemInfo cache", err)
        }
      }

      invoke({ channel: "get-system-info" })
        .then((info) => {
          useSystemStore.setState((state) => {
            const merged = { ...state.systemInfo, ...info }
            localStorage.setItem("sparkle:systemInfo", JSON.stringify(merged))
            return { systemInfo: merged }
          })
          setUsingCache(false)
          log.info("Fetched system info")
        })
        .catch((err) => {
          log.error("Error fetching system info:", err)
          console.error("Error fetching system info:", err)
        })
        .finally(() => setLoading(false))
    })

    return () => cancelIdleCallback(idleHandle)
  }, [])

  useEffect(() => {
    const idleHandle = requestIdleCallback(() => {
      const cached = localStorage.getItem("sparkle:tweakInfo")
      if (cached) {
        try {
          setTweakInfo(JSON.parse(cached))
        } catch (err) {
          console.error("Failed to parse tweakInfo cache", err)
        }
      }

      invoke({ channel: "tweaks:fetch" })
        .then((tweaks) => {
          setTweakInfo(tweaks)
          localStorage.setItem("sparkle:tweakInfo", JSON.stringify(tweaks))
        })
        .catch((err) => {
          console.error("Error fetching tweak info:", err)
        })
    })

    return () => cancelIdleCallback(idleHandle)
  }, [])

  useEffect(() => {
    const idleHandle = requestIdleCallback(() => {
      fetchActiveTweaks()
    })

    return () => cancelIdleCallback(idleHandle)
  }, [])

  useEffect(() => {
    const handleExtraInfo = (_event: any, extra: Record<string, any>) => {
      useSystemStore.setState((state) => {
        const merged = { ...state.systemInfo, ...extra }
        localStorage.setItem("sparkle:systemInfo", JSON.stringify(merged))
        return { systemInfo: merged }
      })
    }

    window.electron.ipcRenderer.on("system-info-extra", handleExtraInfo)
    return () => {
      window.electron.ipcRenderer.removeListener("system-info-extra", handleExtraInfo)
    }
  }, [])

  const formatBytes = (bytes) => {
    if (bytes === 0 || !bytes) return "0 " + t("GB")
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + " " + t("GB")
  }

  if (loading) {
    return (
      <RootDiv>
        <div className="flex items-center justify-center h-64 flex-col gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-[3px] border-sparkle-border rounded-full"></div>
            <div
              className="absolute inset-0 border-[3px] border-transparent border-t-sparkle-primary rounded-full animate-spin"
              role="status"
              aria-label="loading"
            ></div>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <p className="text-sparkle-text-dark font-medium">{t("Loading system information")}</p>
            <p className="text-sparkle-text-muted text-sm">
              {t("This may take a while depending on your system")}
            </p>
          </div>
          <p className="text-xs text-sparkle-secondary bg-sparkle-accent px-3 py-1.5 rounded-full mt-1">
            {t("You can use other parts of Sparkle while this loads")}
          </p>
        </div>
      </RootDiv>
    )
  }

  return (
    <RootDiv>
      <div className="max-w-[1800px] mx-auto ">
        <Greeting />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard
            icon={Cpu}
            iconBgColor="bg-blue-500/10"
            iconColor="text-blue-500"
            title={t("CPU")}
            subtitle={t("Processor Information")}
            items={[
              { label: t("Model"), value: systemInfo?.cpu_model || t("Unknown") },
              { label: t("Cores"), value: `${systemInfo?.cpu_cores || "0"} ${t("Cores")}` },
            ]}
          />

          <InfoCard
            icon={Gpu}
            iconBgColor="bg-teal-500/10"
            iconColor="text-teal-500"
            title={t("GPU")}
            subtitle={t("Graphics Information")}
            items={
              systemInfo?.hasGPU
                ? [
                    { label: t("Model"), value: systemInfo?.gpu_model || t("Loading...") },
                    { label: t("VRAM"), value: systemInfo?.vram || t("Loading...") },
                  ]
                : [
                    { label: t("Model"), value: systemInfo?.integrated_gpu || t("Loading...") },
                    { label: t("Type"), value: t("Integrated") },
                  ]
            }
          />

          <InfoCard
            icon={MemoryStick}
            iconBgColor="bg-purple-500/10"
            iconColor="text-purple-500"
            title={t("Memory")}
            subtitle={t("RAM Information")}
            items={[
              { label: t("Total Memory"), value: formatBytes(systemInfo?.memory_total) },
              { label: t("Type"), value: systemInfo?.memory_type || t("Unknown") },
            ]}
          />

          <InfoCard
            icon={MonitorCog}
            iconBgColor="bg-red-500/10"
            iconColor="text-red-500"
            title={t("System")}
            subtitle={t("OS Information")}
            items={[
              { label: t("Operating System"), value: systemInfo?.os || t("Unknown") },
              { label: t("Version"), value: systemInfo?.os_version || t("Unknown") },
            ]}
          />

          <InfoCard
            icon={HardDrive}
            iconBgColor="bg-orange-500/10"
            iconColor="text-orange-500"
            title={t("Storage")}
            subtitle={t("Disk Information")}
            items={[
              { label: t("Primary Disk"), value: systemInfo?.disk_model || t("Loading...") },
              { label: t("Total Space"), value: systemInfo?.disk_size || t("Loading...") },
            ]}
          />

          <InfoCard
            icon={Wrench}
            iconBgColor="bg-green-500/10"
            iconColor="text-green-500"
            title={t("Tweaks")}
            subtitle={t("Applied Tweaks")}
            items={[
              { label: t("Available Tweaks"), value: `${tweakInfo?.length || 0} ${t("Tweaks")}` },
              { label: t("Active Tweaks"), value: `${activeTweaks.length || 0} ${t("Active")}` },
            ]}
          />
        </div>
        <Card className="bg-sparkle-card backdrop-blur-xs rounded-xl border border-sparkle-border hover:shadow-xs overflow-hidden p-3 w-full mt-4 flex gap-4 items-center">
          <div className="p-3 bg-green-500/10 rounded-lg items-center justify-center text-center">
            <Wrench className="text-green-500" size={24} />
          </div>
          <div>
            <h1 className="font-medium text-sparkle-text">{t("PC Running slow?")}</h1>
            <p className="text-sparkle-text-secondary">
              {t("Try Using Tweaks to improve system performance and privacy.")}
            </p>
          </div>
          <div className="ml-auto">
            <Button variant="outline" className="flex items-center gap-2" onClick={goToTweaks}>
              <Zap size={18} /> {t("Visit Tweaks")}
            </Button>
          </div>
        </Card>
        <p className="text-xs text-sparkle-text-secondary text-center mt-4">
          {usingCache ? t("Loading latest system data...") : ""}
        </p>
      </div>
    </RootDiv>
  )
}

export default Home
