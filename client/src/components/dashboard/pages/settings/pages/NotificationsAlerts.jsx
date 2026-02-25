import React, {useState} from 'react'
import { BarChart2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select'
import { Switch } from '@/components/ui/shadcn/switch'
import { Separator } from '@/components/ui/shadcn/separator'
import { Label } from '@/components/ui/label'

export function NotificationsAlerts() {
    const [thresholdAlerts, setThresholdAlerts] = useState(true)
    const [selectedPriorityLevels, setPriorityLevelsIsChecked] = useState([])
    const [shareWithTeam, setShareWithTeamToggle] = useState(true)
    const [NotificationChannels, setNotificationChannels] = useState('slack')
    const [scheduledReports, setScheduledReports] = useState(true)
    

    return (
        <></>

    )
}
