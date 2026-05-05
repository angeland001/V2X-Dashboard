import React, { useState, useRef, useEffect } from "react";
import { Send, Wifi, WifiOff } from "lucide-react";
import { Button } from "../../../ui/shadcn/button";
import { Input } from "../../../ui/shadcn/input";
import { testTelnetConnection, sendTelnetCommand } from "../../../../services/controllers";

export function TelnetTerminal({ adapter }) {
  const [lines,        setLines]        = useState([
    { type: "system", text: `Connected to ${adapter.ipAddress}:${adapter.telnetPort ?? 23}` },
    { type: "system", text: 'Type a command and press Enter or click Send. Use ↑/↓ for history.' },
  ]);
  const [inputValue,   setInputValue]   = useState("");
  const [history,      setHistory]      = useState([]);
  const [historyIdx,   setHistoryIdx]   = useState(-1);
  const [sending,      setSending]      = useState(false);
  const [testing,      setTesting]      = useState(false);
  const [testResult,   setTestResult]   = useState(null);

  const terminalRef = useRef(null);
  const inputRef    = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const appendLine = (type, text) =>
    setLines((prev) => [...prev, { type, text, id: Date.now() + Math.random() }]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testTelnetConnection(adapter.id);
      setTestResult({ success: true, latencyMs: result.latencyMs });
      appendLine("system", `✓ Connection OK — ${result.latencyMs}ms`);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
      appendLine("error", `✗ ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSend = async () => {
    const cmd = inputValue.trim();
    if (!cmd || sending) return;

    appendLine("input", `> ${cmd}`);
    setHistory((prev) => [cmd, ...prev.slice(0, 49)]);
    setHistoryIdx(-1);
    setInputValue("");
    setSending(true);

    try {
      const result = await sendTelnetCommand(adapter.id, cmd);
      appendLine("output", result.output || "(no output)");
    } catch (err) {
      appendLine("error", `Error: ${err.message}`);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSend();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIdx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(newIdx);
      setInputValue(history[newIdx] ?? "");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(newIdx);
      setInputValue(newIdx === -1 ? "" : (history[newIdx] ?? ""));
    }
  };

  const lineStyle = {
    input:  "text-neutral-400",
    output: "text-green-300",
    error:  "text-red-400",
    system: "text-yellow-500",
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-neutral-400">
            {adapter.ipAddress}:{adapter.telnetPort ?? 23}
          </span>
          {testResult && (
            <span className={`text-xs flex items-center gap-1 ${testResult.success ? "text-green-400" : "text-red-400"}`}>
              {testResult.success ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {testResult.success ? `${testResult.latencyMs}ms` : "Failed"}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs border-neutral-700 text-neutral-300 hover:bg-neutral-800"
          onClick={handleTest}
          disabled={testing}
        >
          {testing ? "Testing…" : "Test Connection"}
        </Button>
      </div>

      {/* Terminal output */}
      <div
        ref={terminalRef}
        className="font-mono text-xs bg-neutral-950 border border-neutral-800 rounded-md p-3 h-48 overflow-y-auto"
      >
        {lines.map((line, i) => (
          <div key={line.id ?? i} className={lineStyle[line.type] ?? "text-neutral-300"}>
            {line.text}
          </div>
        ))}
        {sending && (
          <div className="text-neutral-600 animate-pulse">▋</div>
        )}
      </div>

      {/* Command input */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setHistoryIdx(-1); }}
          onKeyDown={handleKeyDown}
          placeholder="Enter command…"
          disabled={sending}
          className="font-mono text-xs bg-neutral-950 border-neutral-700 text-green-300 placeholder:text-neutral-600 focus-visible:ring-green-800"
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || !inputValue.trim()}
          className="gap-1 bg-neutral-700 hover:bg-neutral-600 text-white"
        >
          <Send className="h-3.5 w-3.5" />
          {sending ? "…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
