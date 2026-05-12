import React, { useState } from "react";
import { X, Wifi, Cpu, ClipboardList, Activity, Settings2 } from "lucide-react";
import { Button } from "../../../ui/shadcn/button";
import { Badge } from "../../../ui/shadcn/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/shadcn/tabs";
import { TimingParametersTable } from "./TimingParametersTable";
import { PreemptionControlPanel } from "./PreemptionControlPanel";
import { AuditLogTable }         from "./AuditLogTable";
import { AdapterSettingsForm }   from "./AdapterSettingsForm";
import { usePhasePolling }       from "../../../../hooks/controllers/usePhasePolling";

const STATUS_COLOR = {
  active:      "text-green-400",
  offline:     "text-red-400",
  maintenance: "text-yellow-400",
};

const ADAPTER_TYPE_LABEL = {
  siemens_m60:     "Siemens M60",
  econolite_aries: "Econolite ARIES",
  peek_ada:        "Peek ADA",
  ntcip1202:       "NTCIP 1202",
  generic_snmp:    "Generic SNMP",
};

export function ControllerDetailPanel({ adapter, onClose, onProbed, onUpdated }) {
  const [selectedGroup, setSelectedGroup] = useState(1);
  const [probing,       setProbing]       = useState(false);

  const { timingData, loading: phaseLoading } =
    usePhasePolling(adapter?.id, selectedGroup);

  const statusColorClass = STATUS_COLOR[adapter.connectionStatus] ?? "text-neutral-400";

  const handleProbe = async () => {
    if (!onProbed) return;
    setProbing(true);
    try {
      await onProbed(adapter.id);
    } finally {
      setProbing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 overflow-hidden">
      {/* Panel header */}
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-neutral-800 flex-shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-neutral-100 truncate">
              {adapter.label || adapter.ipAddress}
            </h2>
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {ADAPTER_TYPE_LABEL[adapter.adapterType] ?? adapter.adapterType}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-400">
            <span className="font-mono">{adapter.ipAddress}</span>
            <span className="text-neutral-600">·</span>
            <span className={`capitalize font-medium ${statusColorClass}`}>
              {adapter.connectionStatus}
            </span>
            {adapter.intersectionName && (
              <>
                <span className="text-neutral-600">·</span>
                <span className="truncate">{adapter.intersectionName}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            onClick={handleProbe}
            disabled={probing}
          >
            <Wifi className="h-3 w-3 mr-1" />
            {probing ? "Probing…" : "Probe"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-neutral-500 hover:text-neutral-200"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="phases" className="flex flex-col h-full">
          <TabsList className="mx-4 mt-3 bg-neutral-900 border border-neutral-800 flex-shrink-0 w-auto justify-start">
            <TabsTrigger value="phases" className="gap-1.5 data-[state=active]:bg-neutral-700 text-xs">
              <Activity className="h-3 w-3" />
              Phases
            </TabsTrigger>
            <TabsTrigger value="preemption" className="gap-1.5 data-[state=active]:bg-neutral-700 text-xs">
              <Cpu className="h-3 w-3" />
              Preemption
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5 data-[state=active]:bg-neutral-700 text-xs">
              <ClipboardList className="h-3 w-3" />
              Audit
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 data-[state=active]:bg-neutral-700 text-xs">
              <Settings2 className="h-3 w-3" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="phases" className="flex-1 px-4 pb-4 mt-3 space-y-4">
            <div className="flex items-center gap-1">
              <span className="text-xs text-neutral-500 mr-1">Phase</span>
              {[1,2,3,4,5,6,7,8].map((n) => (
                <button
                  key={n}
                  onClick={() => setSelectedGroup(n)}
                  className={`h-6 w-6 rounded text-xs font-mono transition-colors ${
                    selectedGroup === n
                      ? "bg-neutral-700 text-neutral-100"
                      : "bg-neutral-800 text-neutral-500 hover:bg-neutral-700/60 hover:text-neutral-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <TimingParametersTable
              adapterId={adapter.id}
              signalGroup={selectedGroup}
              timingData={timingData}
              loading={phaseLoading}
            />
          </TabsContent>

          <TabsContent value="preemption" className="flex-1 px-4 pb-4 mt-3">
            <PreemptionControlPanel adapter={adapter} />
          </TabsContent>

          <TabsContent value="audit" className="flex-1 px-4 pb-4 mt-3">
            <AuditLogTable adapterId={adapter.id} />
          </TabsContent>

          <TabsContent value="settings" className="flex-1 px-4 pb-4 mt-3">
            <AdapterSettingsForm
              adapter={adapter}
              onSaved={onUpdated}
              onProbed={handleProbe}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
