import React, { useRef, useState, useEffect } from "react"
import { useDispatch } from "react-redux"
import KeplerGL from "@kepler.gl/components"
import { addDataToMap, wrapTo } from "@kepler.gl/actions"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, RadialBarChart, RadialBar
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/shadcn/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/shadcn/chart"

// Stat card data
const statCards = [
  { title: "Real Time Users", value: "60.7k", change: "+125%", positive: true },
  { title: "Total Visits", value: "40.2k", change: "+125%", positive: true },
  { title: "Visit Duration", value: "36h 52m", change: "+125%", positive: true },
]

// Views donut chart data
const viewsData = [
  { name: "Pakistan", value: 45, fill: "#ff8787" },
  { name: "China", value: 30, fill: "#f8c4b4" },
  { name: "Canada", value: 15, fill: "#e5ebb2" },
  { name: "America", value: 10, fill: "#bce29e" },
]

// Traffic channel bar chart data
const trafficChannelData = [
  { day: "Mon", hotline: 20000, balance: 12000, total: 8000 },
  { day: "Tue", hotline: 25000, balance: 18000, total: 14000 },
  { day: "Wed", hotline: 28000, balance: 22000, total: 18000 },
  { day: "Thu", hotline: 15000, balance: 10000, total: 6000 },
  { day: "Fri", hotline: 22000, balance: 15000, total: 10000 },
  { day: "Sat", hotline: 18000, balance: 12000, total: 8000 },
  { day: "Sun", hotline: 12000, balance: 8000, total: 5000 },
]

// Device views data
const deviceViewsData = [
  { name: "Mobile", value: 55, fill: "#ff8787" },
  { name: "Web App", value: 30, fill: "#e5ebb2" },
  { name: "Tablet", value: 15, fill: "#bce29e" },
]

// Viewers age data
const viewersAgeData = [
  { age: "00-18", viewers: 40 },
  { age: "18-25", viewers: 60 },
  { age: "26-35", viewers: 75 },
  { age: "36-45", viewers: 55 },
  { age: "46-55", viewers: 65 },
  { age: "55+", viewers: 35 },
]

// Engagement data
const engagementData = [
  { platform: "Google", value: "134k" },
  { platform: "Facebook", value: "130k" },
  { platform: "Instagram", value: "120k" },
  { platform: "Snapchat", value: "118k" },
  { platform: "Tiktok", value: "115k" },
  { platform: "Youtube", value: "107k" },
  { platform: "WhatsApp", value: "089k" },
]

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export function AnalyticsTraffic() {
  const dispatch = useDispatch();
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      setDimensions({ width: clientWidth, height: clientHeight });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    dispatch(
      wrapTo(
        "traffic_flow_patterns",
        addDataToMap({
          datasets: {
            info: { label: "Empty", id: "traffic_flow_patterns" },
            data: { fields: [], rows: [] },
          },
          options: {
            centerMap: true,
            readOnly: false,
            keepExistingConfig: false,
          },
          config: {
            mapState: {
              latitude: 35.0456,
              longitude: -85.3097,
              zoom: 12,
              pitch: 0,
              bearing: 0,
            },
            mapStyle: { styleType: "dark" },
          },
        })
      )
    );
  }, [dispatch]);

  return (
    <div className="space-y-6">
      {/* Stat Cards Row */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-[#1e1f25] border-neutral-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-neutral-400">{stat.title}</p>
                <span className="text-sm text-[#6dc956] flex items-center gap-1">
                  {stat.change}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2L10 7H2L6 2Z" fill="#6dc956" />
                  </svg>
                </span>
              </div>
              <p className="text-2xl font-semibold text-neutral-100 tracking-wide">{stat.value}</p>
            </CardContent>
          </Card>
        ))}

        {/* Views Donut Card */}
        <Card className="bg-[#1e1f25] border-neutral-800 row-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-neutral-400">Views</p>
              <p className="text-xl font-semibold text-neutral-100">174k</p>
            </div>
            <div className="h-[180px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={viewsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {viewsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e1f25", border: "1px solid #3a3b40", borderRadius: "8px" }}
                    itemStyle={{ color: "#e9e9e9" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {viewsData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-xs text-neutral-400">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Channel & Maps Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Traffic Channel Bar Chart */}
        <Card className="bg-[#1e1f25] border-neutral-800 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-neutral-100 text-base">Traffic Channel</CardTitle>
            <div className="flex gap-4 mt-2">
              {["Hotline", "Balance", "Total", "Weekly"].map((tab) => (
                <span key={tab} className="text-xs text-neutral-500 hover:text-neutral-300 cursor-pointer">{tab}</span>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trafficChannelData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#303030" vertical={false} />
                  <XAxis dataKey="day" stroke="#8a8a8a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8a8a8a" fontSize={12} tickLine={false} axisLine={false}
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e1f25", border: "1px solid #3a3b40", borderRadius: "8px" }}
                    itemStyle={{ color: "#e9e9e9" }}
                  />
                  <Bar dataKey="hotline" fill="#f8c4b4" radius={[10, 10, 10, 10]} barSize={35} />
                  <Bar dataKey="balance" fill="#e5ebb2" radius={[10, 10, 10, 10]} barSize={35} />
                  <Bar dataKey="total" fill="#ff8787" radius={[10, 10, 10, 10]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Side Column - Devices & Viewers */}
        <div className="space-y-4">
          {/* Views From Devices */}
          <Card className="bg-[#1e1f25] border-neutral-800">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-neutral-100 mb-3">Views From Devices</p>
              <div className="flex items-center gap-2 mb-3">
                {deviceViewsData.map((device) => (
                  <div key={device.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: device.fill }} />
                    <span className="text-xs text-neutral-400">{device.name}</span>
                  </div>
                ))}
              </div>
              <div className="h-4 bg-[#2f2f2f] rounded-full overflow-hidden flex">
                {deviceViewsData.map((device) => (
                  <div
                    key={device.name}
                    className="h-full rounded-full"
                    style={{ width: `${device.value}%`, backgroundColor: device.fill }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Viewers Age Distribution */}
          <Card className="bg-[#1e1f25] border-neutral-800">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-neutral-100 mb-3">Viewers</p>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={viewersAgeData} barGap={4}>
                    <XAxis dataKey="age" stroke="#8a8a8a" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e1f25", border: "1px solid #3a3b40", borderRadius: "8px" }}
                      itemStyle={{ color: "#e9e9e9" }}
                    />
                    <Bar dataKey="viewers" radius={[10, 10, 10, 10]} barSize={14}>
                      {viewersAgeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#f8c4b4" : "#e5ebb2"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Kepler Map */}
      <Card className="bg-[#1e1f25] border-neutral-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-neutral-100 text-base">Peak Traffic Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={containerRef} className="h-[500px] w-full rounded overflow-hidden">
            <KeplerGL
              id="traffic_flow_patterns"
              mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_API}
              width={dimensions.width}
              height={dimensions.height}
            />
          </div>
        </CardContent>
      </Card>

      {/* Engagements Row */}
      <Card className="bg-[#1e1f25] border-neutral-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-neutral-100 text-base">Engagements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-4">
            {engagementData.map((item) => (
              <div key={item.platform} className="text-center">
                <p className="text-lg font-semibold text-neutral-100">{item.value}</p>
                <p className="text-xs text-neutral-500 mt-1">{item.platform}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AnalyticsTraffic
