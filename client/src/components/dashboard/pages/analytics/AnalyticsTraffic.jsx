import React, { useRef, useState, useEffect } from "react"
import { useDispatch } from "react-redux"
import KeplerGL from "@kepler.gl/components"
import { addDataToMap, wrapTo } from "@kepler.gl/actions"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, RadialBarChart, RadialBar, PolarGrid,
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/shadcn/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/shadcn/chart"



// Stat card data with chart data
const statCards = [
  { 
    title: "Real Time Users", 
    value: "843", 
    change: "+60%", 
    positive: true,
    chartData: [
      { month: "Jan", value: 45 },
      { month: "Feb", value: 52 },
      { month: "Mar", value: 348 },
      { month: "Apr", value: 355 },
      { month: "May", value: 458 },
      { month: "Jun", value: 861 },
    ]
  },
  { 
    title: "Total Visits", 
    value: "40.2k", 
    change: "+20%", 
    positive: true,
    chartData: [
      { month: "Jan", value: 4535 },
      { month: "Feb", value: 4256 },
      { month: "Mar", value: 13437 },
      { month: "Apr", value: 28308 },
      { month: "May", value: 31009 },
      { month: "Jun", value: 40020 },
    ]
  },
  { 
    title: "Visit Duration", 
    value: "36h 52m", 
    change: "+125%", 
    positive: true,
    chartData: [
      { month: "Jan", value: 18 },
      { month: "Feb", value: 22 },
      { month: "Mar", value: 25 },
      { month: "Apr", value: 30 },
      { month: "May", value: 33 },
      { month: "Jun", value: 37 },
    ]
  },
]

// Chart config for stat cards
const statChartConfig = {
  value: {
    label: "Value",
    color: "#969696",
  },
}

// Views radial chart data
const viewsData = [
  { location: "East Brainerd", visitors: 275, fill: "#252525" },
  { location: "Downtown", visitors: 200, fill: "#525252" },
  { location: "UTC", visitors: 187, fill: "#737373" },
  { location: "Hixson", visitors: 173, fill: "#969696" },
]

const viewsChartConfig = {
  visitors: {
    label: "Visitors",
  },
  "East Brainerd": {
    label: "East Brainerd",
    color: "#252525",
  },
  "Downtown": {
    label: "Downtown",
    color: "#525252",
  },
  "UTC": {
    label: "UTC",
    color: "#737373",
  },
  "Hixson": {
    label: "Hixson",
    color: "#969696",
  },
}

// Traffic channel bar chart data
const trafficChannelData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 73 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
]

const trafficChannelConfig = {
  desktop: {
    label: "Desktop",
    color: "#737373",
  },
}

// Device views data
const deviceViewsData = [
  { name: "Mobile", value: 55, fill: "#525252" },
  { name: "Web App", value: 30, fill: "#737373" },
  { name: "Tablet", value: 15, fill: "#969696" },
]

// Viewers age data - stacked
const viewersAgeData = [
  { age: "00-18", male: 450, female: 300 },
  { age: "18-25", male: 380, female: 420 },
  { age: "26-35", male: 520, female: 120 },
  { age: "36-45", male: 140, female: 550 },
  { age: "46-55", male: 600, female: 350 },
  { age: "55+", male: 480, female: 400 },
]

const viewersAgeConfig = {
  male: {
    label: "Male",
    color: "#737373",
  },
  female: {
    label: "Female",
    color: "#bdbdbd",
  },
}


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
          <Card key={stat.title} className="bg-black-900 border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)] h-[340px] flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-neutral-400">{stat.title}</p>
                <span className="text-sm text-[#6dc956] flex items-center gap-1">
                  {stat.change}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2L10 7H2L6 2Z" fill="#6dc956" />
                  </svg>
                </span>
              </div>
              <p className="text-3xl font-semibold text-neutral-100 tracking-wide mb-4">{stat.value}</p>
              
              {/* Mini Area Chart */}
              <div className="flex-1 -mx-2 mt-2">
                <ChartContainer config={statChartConfig} className="h-full w-full">
                  <AreaChart
                    data={stat.chartData}
                    margin={{
                      top: 5,
                      right: 5,
                      left: 5,
                      bottom: 5,
                    }}
                  >
                    <defs>
                      <linearGradient id={`gradient-${stat.title}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#969696" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#969696" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#303030" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#8a8a8a" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickMargin={5}
                    />
                    <YAxis 
                      stroke="#8a8a8a" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      width={30}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="line" />}
                    />
                    <Area
                      dataKey="value"
                      type="natural"
                      fill={`url(#gradient-${stat.title})`}
                      stroke="#969696"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Views Radial Card */}
        <Card className="bg-black-900 border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)] row-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-neutral-400">Views</p>
              <p className="text-xl font-semibold text-neutral-100">174k</p>
            </div>
            <ChartContainer
              config={viewsChartConfig}
              className="mx-auto aspect-square max-h-[200px]"
            >
              <RadialBarChart data={viewsData} innerRadius={30} outerRadius={100}>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel nameKey="location" />}
                />
                <PolarGrid gridType="circle" stroke="#303030" />
                <RadialBar dataKey="visitors" />
              </RadialBarChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {viewsData.map((item) => (
                <div key={item.location} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-xs text-neutral-400">{item.location}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Channel & Maps Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Traffic Channel Bar Chart */}
        <Card className="bg-black-900 border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)] lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-neutral-100 text-base">Traffic Channel</CardTitle>
            <p className="text-xs text-neutral-500 mt-1">January - June 2024</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trafficChannelConfig} className="h-[280px] w-full">
              <BarChart data={trafficChannelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#303030" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#8a8a8a"
                  fontSize={12}
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="desktop" fill="var(--color-desktop)" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Side Column - Devices & Viewers */}
        <div className="space-y-4">
          {/* Views From Devices */}
          <Card className="bg-black-900 border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)]">
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
          <Card className="bg-black-900 border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)]">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-neutral-100 mb-3">Viewers Age Distribution</p>
              <ChartContainer config={viewersAgeConfig} className="h-[180px] w-full">
                <BarChart data={viewersAgeData}>
                  <XAxis
                    dataKey="age"
                    stroke="#8a8a8a"
                    fontSize={10}
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <Bar
                    dataKey="male"
                    stackId="a"
                    fill="var(--color-male)"
                    radius={[0, 0, 4, 4]}
                  />
                  <Bar
                    dataKey="female"
                    stackId="a"
                    fill="var(--color-female)"
                    radius={[4, 4, 0, 0]}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        className="w-[180px]"
                        formatter={(value, name, item, index) => (
                          <>
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                              style={{
                                backgroundColor: `var(--color-${name})`,
                              }}
                            />
                            {viewersAgeConfig[name]?.label || name}
                            <div className="text-foreground ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums">
                              {value}
                            </div>
                            {/* Add total after the last item */}
                            {index === 1 && (
                              <div className="text-foreground mt-1.5 flex basis-full items-center border-t pt-1.5 text-xs font-medium">
                                Total
                                <div className="text-foreground ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums">
                                  {item.payload.male + item.payload.female}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      />
                    }
                    cursor={false}
                    defaultIndex={1}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Kepler Map */}
      <Card className="bg-black-900 border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)]">
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

      
    </div>
  )
}

export default AnalyticsTraffic
