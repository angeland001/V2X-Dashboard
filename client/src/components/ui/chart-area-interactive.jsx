"use client"

import * as React from "react"
import { StatCard } from "@/components/ui/stat-card"
import { TrafficChart } from "@/components/ui/traffic-chart"
import { TrafficDataTable } from "@/components/ui/traffic-data-table"

export const description = "Traffic patterns showing pedestrians and vehicles over time"

const locationData = {
  "Georgia Ave": [
    { date: "2024-04-01", vehicles: 1522, pedestrians: 350 },
    { date: "2024-04-02", vehicles: 1297, pedestrians: 480 },
    { date: "2024-04-03", vehicles: 1467, pedestrians: 320 },
    { date: "2024-04-04", vehicles: 1842, pedestrians: 560 },
    { date: "2024-04-05", vehicles: 1673, pedestrians: 490 },
    { date: "2024-04-06", vehicles: 1201, pedestrians: 240 },
    { date: "2024-04-07", vehicles: 1145, pedestrians: 180 },
    { date: "2024-04-08", vehicles: 1709, pedestrians: 420 },
    { date: "2024-04-09", vehicles: 1359, pedestrians: 310 },
    { date: "2024-04-10", vehicles: 1561, pedestrians: 390 },
    { date: "2024-04-11", vehicles: 1827, pedestrians: 450 },
    { date: "2024-04-12", vehicles: 1692, pedestrians: 410 },
    { date: "2024-04-13", vehicles: 1342, pedestrians: 280 },
    { date: "2024-04-14", vehicles: 1137, pedestrians: 220 },
    { date: "2024-04-15", vehicles: 1120, pedestrians: 170 },
    { date: "2024-04-16", vehicles: 1438, pedestrians: 290 },
    { date: "2024-04-17", vehicles: 1946, pedestrians: 560 },
    { date: "2024-04-18", vehicles: 1764, pedestrians: 510 },
    { date: "2024-04-19", vehicles: 1543, pedestrians: 380 },
    { date: "2024-04-20", vehicles: 1089, pedestrians: 150 },
    { date: "2024-04-21", vehicles: 1237, pedestrians: 200 },
    { date: "2024-04-22", vehicles: 1524, pedestrians: 370 },
    { date: "2024-04-23", vehicles: 1638, pedestrians: 430 },
    { date: "2024-04-24", vehicles: 1887, pedestrians: 490 },
    { date: "2024-04-25", vehicles: 1615, pedestrians: 450 },
    { date: "2024-04-26", vehicles: 1175, pedestrians: 230 },
    { date: "2024-04-27", vehicles: 1283, pedestrians: 320 },
    { date: "2024-04-28", vehicles: 1122, pedestrians: 180 },
    { date: "2024-04-29", vehicles: 1715, pedestrians: 440 },
    { date: "2024-04-30", vehicles: 1954, pedestrians: 580 },
    { date: "2024-05-01", vehicles: 1665, pedestrians: 420 },
    { date: "2024-05-02", vehicles: 1793, pedestrians: 510 },
    { date: "2024-05-03", vehicles: 1547, pedestrians: 390 },
    { date: "2024-05-04", vehicles: 1285, pedestrians: 320 },
    { date: "2024-05-05", vehicles: 1481, pedestrians: 290 },
    { date: "2024-05-06", vehicles: 1898, pedestrians: 520 },
    { date: "2024-05-07", vehicles: 1688, pedestrians: 400 },
    { date: "2024-05-08", vehicles: 1449, pedestrians: 310 },
    { date: "2024-05-09", vehicles: 1527, pedestrians: 380 },
    { date: "2024-05-10", vehicles: 1693, pedestrians: 430 },
    { date: "2024-05-11", vehicles: 1235, pedestrians: 270 },
    { date: "2024-05-12", vehicles: 1097, pedestrians: 140 },
    { date: "2024-05-13", vehicles: 1197, pedestrians: 160 },
    { date: "2024-05-14", vehicles: 1748, pedestrians: 490 },
    { date: "2024-05-15", vehicles: 1873, pedestrians: 580 },
    { date: "2024-05-16", vehicles: 1638, pedestrians: 400 },
    { date: "2024-05-17", vehicles: 1899, pedestrians: 520 },
    { date: "2024-05-18", vehicles: 1215, pedestrians: 250 },
    { date: "2024-05-19", vehicles: 1135, pedestrians: 180 },
    { date: "2024-05-20", vehicles: 1477, pedestrians: 330 },
    { date: "2024-05-21", vehicles: 1582, pedestrians: 440 },
    { date: "2024-05-22", vehicles: 1681, pedestrians: 420 },
    { date: "2024-05-23", vehicles: 1752, pedestrians: 490 },
    { date: "2024-05-24", vehicles: 1594, pedestrians: 420 },
    { date: "2024-05-25", vehicles: 1301, pedestrians: 350 },
    { date: "2024-05-26", vehicles: 1213, pedestrians: 270 },
    { date: "2024-05-27", vehicles: 1820, pedestrians: 560 },
    { date: "2024-05-28", vehicles: 1633, pedestrians: 490 },
    { date: "2024-05-29", vehicles: 1478, pedestrians: 330 },
    { date: "2024-05-30", vehicles: 1740, pedestrians: 480 },
    { date: "2024-05-31", vehicles: 1578, pedestrians: 430 },
    { date: "2024-06-01", vehicles: 1278, pedestrians: 300 },
    { date: "2024-06-02", vehicles: 1870, pedestrians: 510 },
    { date: "2024-06-03", vehicles: 1403, pedestrians: 360 },
    { date: "2024-06-04", vehicles: 1739, pedestrians: 480 },
    { date: "2024-06-05", vehicles: 1588, pedestrians: 440 },
    { date: "2024-06-06", vehicles: 1694, pedestrians: 450 },
    { date: "2024-06-07", vehicles: 1823, pedestrians: 570 },
    { date: "2024-06-08", vehicles: 1685, pedestrians: 420 },
    { date: "2024-06-09", vehicles: 1938, pedestrians: 580 },
    { date: "2024-06-10", vehicles: 1555, pedestrians: 400 },
    { date: "2024-06-11", vehicles: 1392, pedestrians: 350 },
    { date: "2024-06-12", vehicles: 1892, pedestrians: 520 },
    { date: "2024-06-13", vehicles: 1481, pedestrians: 330 },
    { date: "2024-06-14", vehicles: 1726, pedestrians: 480 },
    { date: "2024-06-15", vehicles: 1607, pedestrians: 450 },
    { date: "2024-06-16", vehicles: 1271, pedestrians: 310 },
    { date: "2024-06-17", vehicles: 1975, pedestrians: 520 },
    { date: "2024-06-18", vehicles: 1507, pedestrians: 370 },
    { date: "2024-06-19", vehicles: 1741, pedestrians: 490 },
    { date: "2024-06-20", vehicles: 1808, pedestrians: 550 },
    { date: "2024-06-21", vehicles: 1569, pedestrians: 410 },
    { date: "2024-06-22", vehicles: 1617, pedestrians: 470 },
    { date: "2024-06-23", vehicles: 1880, pedestrians: 530 },
    { date: "2024-06-24", vehicles: 1532, pedestrians: 380 },
    { date: "2024-06-25", vehicles: 1441, pedestrians: 390 },
    { date: "2024-06-26", vehicles: 1734, pedestrians: 480 },
    { date: "2024-06-27", vehicles: 1848, pedestrians: 590 },
    { date: "2024-06-28", vehicles: 1649, pedestrians: 400 },
    { date: "2024-06-29", vehicles: 1503, pedestrians: 360 },
    { date: "2024-06-30", vehicles: 1846, pedestrians: 500 },
  ],
  "Houston St": [
    { date: "2024-04-01", vehicles: 1822, pedestrians: 250 },
    { date: "2024-04-02", vehicles: 1697, pedestrians: 380 },
    { date: "2024-04-03", vehicles: 1367, pedestrians: 220 },
    { date: "2024-04-04", vehicles: 1942, pedestrians: 460 },
    { date: "2024-04-05", vehicles: 1573, pedestrians: 390 },
    { date: "2024-04-06", vehicles: 1401, pedestrians: 340 },
    { date: "2024-04-07", vehicles: 1245, pedestrians: 280 },
    { date: "2024-04-08", vehicles: 1809, pedestrians: 520 },
    { date: "2024-04-09", vehicles: 1459, pedestrians: 210 },
    { date: "2024-04-10", vehicles: 1761, pedestrians: 490 },
    { date: "2024-04-11", vehicles: 1927, pedestrians: 550 },
    { date: "2024-04-12", vehicles: 1592, pedestrians: 310 },
    { date: "2024-04-13", vehicles: 1442, pedestrians: 380 },
    { date: "2024-04-14", vehicles: 1237, pedestrians: 320 },
    { date: "2024-04-15", vehicles: 1320, pedestrians: 270 },
    { date: "2024-04-16", vehicles: 1638, pedestrians: 390 },
    { date: "2024-04-17", vehicles: 1846, pedestrians: 460 },
    { date: "2024-04-18", vehicles: 1964, pedestrians: 510 },
    { date: "2024-04-19", vehicles: 1643, pedestrians: 280 },
    { date: "2024-04-20", vehicles: 1289, pedestrians: 250 },
    { date: "2024-04-21", vehicles: 1437, pedestrians: 300 },
    { date: "2024-04-22", vehicles: 1724, pedestrians: 470 },
    { date: "2024-04-23", vehicles: 1538, pedestrians: 330 },
    { date: "2024-04-24", vehicles: 1987, pedestrians: 590 },
    { date: "2024-04-25", vehicles: 1715, pedestrians: 450 },
    { date: "2024-04-26", vehicles: 1375, pedestrians: 330 },
    { date: "2024-04-27", vehicles: 1483, pedestrians: 420 },
    { date: "2024-04-28", vehicles: 1222, pedestrians: 280 },
    { date: "2024-04-29", vehicles: 1615, pedestrians: 340 },
    { date: "2024-04-30", vehicles: 1854, pedestrians: 480 },
    { date: "2024-05-01", vehicles: 1565, pedestrians: 320 },
    { date: "2024-05-02", vehicles: 1893, pedestrians: 510 },
    { date: "2024-05-03", vehicles: 1647, pedestrians: 490 },
    { date: "2024-05-04", vehicles: 1385, pedestrians: 420 },
    { date: "2024-05-05", vehicles: 1681, pedestrians: 390 },
    { date: "2024-05-06", vehicles: 1998, pedestrians: 520 },
    { date: "2024-05-07", vehicles: 1788, pedestrians: 500 },
    { date: "2024-05-08", vehicles: 1549, pedestrians: 410 },
    { date: "2024-05-09", vehicles: 1427, pedestrians: 280 },
    { date: "2024-05-10", vehicles: 1793, pedestrians: 530 },
    { date: "2024-05-11", vehicles: 1535, pedestrians: 370 },
    { date: "2024-05-12", vehicles: 1297, pedestrians: 240 },
    { date: "2024-05-13", vehicles: 1397, pedestrians: 260 },
    { date: "2024-05-14", vehicles: 1948, pedestrians: 590 },
    { date: "2024-05-15", vehicles: 1773, pedestrians: 480 },
    { date: "2024-05-16", vehicles: 1538, pedestrians: 300 },
    { date: "2024-05-17", vehicles: 1799, pedestrians: 420 },
    { date: "2024-05-18", vehicles: 1415, pedestrians: 350 },
    { date: "2024-05-19", vehicles: 1335, pedestrians: 280 },
    { date: "2024-05-20", vehicles: 1677, pedestrians: 430 },
    { date: "2024-05-21", vehicles: 1782, pedestrians: 540 },
    { date: "2024-05-22", vehicles: 1581, pedestrians: 320 },
    { date: "2024-05-23", vehicles: 1852, pedestrians: 590 },
    { date: "2024-05-24", vehicles: 1694, pedestrians: 520 },
    { date: "2024-05-25", vehicles: 1501, pedestrians: 450 },
    { date: "2024-05-26", vehicles: 1413, pedestrians: 370 },
    { date: "2024-05-27", vehicles: 1920, pedestrians: 460 },
    { date: "2024-05-28", vehicles: 1733, pedestrians: 590 },
    { date: "2024-05-29", vehicles: 1378, pedestrians: 230 },
    { date: "2024-05-30", vehicles: 1640, pedestrians: 380 },
    { date: "2024-05-31", vehicles: 1478, pedestrians: 330 },
    { date: "2024-06-01", vehicles: 1378, pedestrians: 400 },
    { date: "2024-06-02", vehicles: 1970, pedestrians: 510 },
    { date: "2024-06-03", vehicles: 1603, pedestrians: 460 },
    { date: "2024-06-04", vehicles: 1839, pedestrians: 580 },
    { date: "2024-06-05", vehicles: 1488, pedestrians: 340 },
    { date: "2024-06-06", vehicles: 1594, pedestrians: 350 },
    { date: "2024-06-07", vehicles: 1723, pedestrians: 470 },
    { date: "2024-06-08", vehicles: 1885, pedestrians: 520 },
    { date: "2024-06-09", vehicles: 1838, pedestrians: 480 },
    { date: "2024-06-10", vehicles: 1655, pedestrians: 500 },
    { date: "2024-06-11", vehicles: 1492, pedestrians: 450 },
    { date: "2024-06-12", vehicles: 1992, pedestrians: 520 },
    { date: "2024-06-13", vehicles: 1381, pedestrians: 230 },
    { date: "2024-06-14", vehicles: 1826, pedestrians: 580 },
    { date: "2024-06-15", vehicles: 1507, pedestrians: 350 },
    { date: "2024-06-16", vehicles: 1471, pedestrians: 410 },
    { date: "2024-06-17", vehicles: 1875, pedestrians: 420 },
    { date: "2024-06-18", vehicles: 1407, pedestrians: 270 },
    { date: "2024-06-19", vehicles: 1641, pedestrians: 390 },
    { date: "2024-06-20", vehicles: 1908, pedestrians: 550 },
    { date: "2024-06-21", vehicles: 1769, pedestrians: 510 },
    { date: "2024-06-22", vehicles: 1517, pedestrians: 370 },
    { date: "2024-06-23", vehicles: 1980, pedestrians: 530 },
    { date: "2024-06-24", vehicles: 1432, pedestrians: 280 },
    { date: "2024-06-25", vehicles: 1541, pedestrians: 490 },
    { date: "2024-06-26", vehicles: 1834, pedestrians: 580 },
    { date: "2024-06-27", vehicles: 1748, pedestrians: 490 },
    { date: "2024-06-28", vehicles: 1549, pedestrians: 300 },
    { date: "2024-06-29", vehicles: 1403, pedestrians: 260 },
    { date: "2024-06-30", vehicles: 1946, pedestrians: 600 },
  ],
  "E MLK BLVD": [
    { date: "2024-04-01", vehicles: 1122, pedestrians: 450 },
    { date: "2024-04-02", vehicles: 1397, pedestrians: 580 },
    { date: "2024-04-03", vehicles: 1567, pedestrians: 420 },
    { date: "2024-04-04", vehicles: 1242, pedestrians: 360 },
    { date: "2024-04-05", vehicles: 1773, pedestrians: 590 },
    { date: "2024-04-06", vehicles: 1601, pedestrians: 540 },
    { date: "2024-04-07", vehicles: 1445, pedestrians: 380 },
    { date: "2024-04-08", vehicles: 1209, pedestrians: 320 },
    { date: "2024-04-09", vehicles: 1659, pedestrians: 510 },
    { date: "2024-04-10", vehicles: 1361, pedestrians: 290 },
    { date: "2024-04-11", vehicles: 1527, pedestrians: 450 },
    { date: "2024-04-12", vehicles: 1892, pedestrians: 510 },
    { date: "2024-04-13", vehicles: 1142, pedestrians: 180 },
    { date: "2024-04-14", vehicles: 1337, pedestrians: 420 },
    { date: "2024-04-15", vehicles: 1220, pedestrians: 370 },
    { date: "2024-04-16", vehicles: 1738, pedestrians: 490 },
    { date: "2024-04-17", vehicles: 1546, pedestrians: 360 },
    { date: "2024-04-18", vehicles: 1464, pedestrians: 510 },
    { date: "2024-04-19", vehicles: 1843, pedestrians: 580 },
    { date: "2024-04-20", vehicles: 1489, pedestrians: 450 },
    { date: "2024-04-21", vehicles: 1637, pedestrians: 500 },
    { date: "2024-04-22", vehicles: 1324, pedestrians: 370 },
    { date: "2024-04-23", vehicles: 1138, pedestrians: 230 },
    { date: "2024-04-24", vehicles: 1587, pedestrians: 490 },
    { date: "2024-04-25", vehicles: 1915, pedestrians: 550 },
    { date: "2024-04-26", vehicles: 1275, pedestrians: 330 },
    { date: "2024-04-27", vehicles: 1683, pedestrians: 520 },
    { date: "2024-04-28", vehicles: 1422, pedestrians: 380 },
    { date: "2024-04-29", vehicles: 1815, pedestrians: 540 },
    { date: "2024-04-30", vehicles: 1354, pedestrians: 280 },
    { date: "2024-05-01", vehicles: 1265, pedestrians: 320 },
    { date: "2024-05-02", vehicles: 1593, pedestrians: 410 },
    { date: "2024-05-03", vehicles: 1747, pedestrians: 590 },
    { date: "2024-05-04", vehicles: 1485, pedestrians: 520 },
    { date: "2024-05-05", vehicles: 1681, pedestrians: 490 },
    { date: "2024-05-06", vehicles: 1298, pedestrians: 220 },
    { date: "2024-05-07", vehicles: 1488, pedestrians: 400 },
    { date: "2024-05-08", vehicles: 1849, pedestrians: 510 },
    { date: "2024-05-09", vehicles: 1627, pedestrians: 480 },
    { date: "2024-05-10", vehicles: 1393, pedestrians: 330 },
    { date: "2024-05-11", vehicles: 1735, pedestrians: 570 },
    { date: "2024-05-12", vehicles: 1597, pedestrians: 540 },
    { date: "2024-05-13", vehicles: 1297, pedestrians: 360 },
    { date: "2024-05-14", vehicles: 1148, pedestrians: 290 },
    { date: "2024-05-15", vehicles: 1573, pedestrians: 480 },
    { date: "2024-05-16", vehicles: 1838, pedestrians: 500 },
    { date: "2024-05-17", vehicles: 1699, pedestrians: 520 },
    { date: "2024-05-18", vehicles: 1515, pedestrians: 450 },
    { date: "2024-05-19", vehicles: 1435, pedestrians: 380 },
    { date: "2024-05-20", vehicles: 1277, pedestrians: 330 },
    { date: "2024-05-21", vehicles: 1182, pedestrians: 240 },
    { date: "2024-05-22", vehicles: 1381, pedestrians: 420 },
    { date: "2024-05-23", vehicles: 1652, pedestrians: 490 },
    { date: "2024-05-24", vehicles: 1794, pedestrians: 520 },
    { date: "2024-05-25", vehicles: 1401, pedestrians: 450 },
    { date: "2024-05-26", vehicles: 1513, pedestrians: 470 },
    { date: "2024-05-27", vehicles: 1220, pedestrians: 360 },
    { date: "2024-05-28", vehicles: 1533, pedestrians: 490 },
    { date: "2024-05-29", vehicles: 1878, pedestrians: 530 },
    { date: "2024-05-30", vehicles: 1640, pedestrians: 480 },
    { date: "2024-05-31", vehicles: 1378, pedestrians: 430 },
    { date: "2024-06-01", vehicles: 1578, pedestrians: 500 },
    { date: "2024-06-02", vehicles: 1170, pedestrians: 310 },
    { date: "2024-06-03", vehicles: 1803, pedestrians: 560 },
    { date: "2024-06-04", vehicles: 1539, pedestrians: 480 },
    { date: "2024-06-05", vehicles: 1688, pedestrians: 540 },
    { date: "2024-06-06", vehicles: 1394, pedestrians: 450 },
    { date: "2024-06-07", vehicles: 1223, pedestrians: 370 },
    { date: "2024-06-08", vehicles: 1585, pedestrians: 420 },
    { date: "2024-06-09", vehicles: 1738, pedestrians: 580 },
    { date: "2024-06-10", vehicles: 1455, pedestrians: 500 },
    { date: "2024-06-11", vehicles: 1692, pedestrians: 550 },
    { date: "2024-06-12", vehicles: 1292, pedestrians: 320 },
    { date: "2024-06-13", vehicles: 1581, pedestrians: 430 },
    { date: "2024-06-14", vehicles: 1126, pedestrians: 280 },
    { date: "2024-06-15", vehicles: 1807, pedestrians: 550 },
    { date: "2024-06-16", vehicles: 1671, pedestrians: 510 },
    { date: "2024-06-17", vehicles: 1375, pedestrians: 420 },
    { date: "2024-06-18", vehicles: 1607, pedestrians: 470 },
    { date: "2024-06-19", vehicles: 1241, pedestrians: 390 },
    { date: "2024-06-20", vehicles: 1508, pedestrians: 450 },
    { date: "2024-06-21", vehicles: 1869, pedestrians: 510 },
    { date: "2024-06-22", vehicles: 1517, pedestrians: 470 },
    { date: "2024-06-23", vehicles: 1380, pedestrians: 430 },
    { date: "2024-06-24", vehicles: 1732, pedestrians: 580 },
    { date: "2024-06-25", vehicles: 1641, pedestrians: 590 },
    { date: "2024-06-26", vehicles: 1134, pedestrians: 280 },
    { date: "2024-06-27", vehicles: 1548, pedestrians: 490 },
    { date: "2024-06-28", vehicles: 1749, pedestrians: 500 },
    { date: "2024-06-29", vehicles: 1603, pedestrians: 460 },
    { date: "2024-06-30", vehicles: 1246, pedestrians: 300 },
  ],
}

const LOCATIONS = ["Georgia Ave", "Houston St", "E MLK BLVD"]

export function ChartAreaInteractive() {
  const [timeRange, setTimeRange] = React.useState("90d")
  const [location, setLocation] = React.useState("Georgia Ave")

  const chartData = locationData[location]

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  const totalVehicles = filteredData.reduce((sum, item) => sum + item.vehicles, 0)
  const totalPedestrians = filteredData.reduce((sum, item) => sum + item.pedestrians, 0)
  const totalTraffic = totalVehicles + totalPedestrians
  const avgDailyTraffic = Math.round(totalTraffic / filteredData.length)
  const peakTraffic = filteredData.reduce((max, item) => {
    const total = item.vehicles + item.pedestrians
    return total > max.total ? { total, date: item.date } : max
  }, { total: 0, date: "" })

  // Calculate trends (comparing first half vs second half of period)
  const midpoint = Math.floor(filteredData.length / 2)
  const firstHalf = filteredData.slice(0, midpoint)
  const secondHalf = filteredData.slice(midpoint)

  const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.vehicles + item.pedestrians, 0) / firstHalf.length
  const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.vehicles + item.pedestrians, 0) / secondHalf.length
  const trafficTrend = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100).toFixed(1)

  const firstHalfVehicles = firstHalf.reduce((sum, item) => sum + item.vehicles, 0) / firstHalf.length
  const secondHalfVehicles = secondHalf.reduce((sum, item) => sum + item.vehicles, 0) / secondHalf.length
  const vehicleTrend = ((secondHalfVehicles - firstHalfVehicles) / firstHalfVehicles * 100).toFixed(1)

  const firstHalfPedestrians = firstHalf.reduce((sum, item) => sum + item.pedestrians, 0) / firstHalf.length
  const secondHalfPedestrians = secondHalf.reduce((sum, item) => sum + item.pedestrians, 0) / secondHalf.length
  const pedestrianTrend = ((secondHalfPedestrians - firstHalfPedestrians) / firstHalfPedestrians * 100).toFixed(1)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Traffic"
          value={totalTraffic.toLocaleString()}
          trend={trafficTrend}
          primaryDescription={parseFloat(trafficTrend) >= 0 ? 'Trending up this period' : 'Trending down this period'}
          secondaryDescription="Combined vehicles and pedestrians"
        />

        <StatCard
          title="Vehicle Count"
          value={totalVehicles.toLocaleString()}
          trend={vehicleTrend}
          primaryDescription={parseFloat(vehicleTrend) >= 0 ? 'Increase in vehicle traffic' : 'Decrease in vehicle traffic'}
          secondaryDescription={parseFloat(vehicleTrend) >= 0 ? 'Traffic volume growing' : 'Volume needs monitoring'}
        />

        <StatCard
          title="Pedestrian Count"
          value={totalPedestrians.toLocaleString()}
          trend={pedestrianTrend}
          primaryDescription={parseFloat(pedestrianTrend) >= 0 ? 'Strong pedestrian activity' : 'Lower pedestrian activity'}
          secondaryDescription={parseFloat(pedestrianTrend) >= 0 ? 'Foot traffic exceeds baseline' : 'Activity below average'}
        />

        <StatCard
          title="Daily Average"
          value={avgDailyTraffic.toLocaleString()}
          trend={((avgDailyTraffic / 2000) * 100).toFixed(1)}
          primaryDescription="Steady performance increase"
          secondaryDescription="Meets traffic projections"
        />
      </div>

      <TrafficChart
        filteredData={filteredData}
        location={location}
        setLocation={setLocation}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        locations={LOCATIONS}
      />

      <TrafficDataTable data={filteredData} location={location} />
    </div>
  )
}
