"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide a production-ready device/microphone test page
 * for a PWA. It requests mic permissions, lists available audio input devices,
 * allows selecting a microphone and toggling capture constraints, visualizes live
 * input level, and records a short test clip for playback. It guides users to
 * start a new session at /sessions/new and links to other relevant pages for a
 * smooth setup flow.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";

type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

interface MicConstraintState {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export default function DevicesSettingsPage() {
  const [permission, setPermission] = useState<PermissionState>("prompt");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | "default" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordUrl, setRecordUrl] = useState<string | null>(null);
  const [monitor, setMonitor] = useState(false);
  const [level, setLevel] = useState(0);
  const [sampleRate, setSampleRate] = useState<number | null>(null);
  const [isEnumerated, setIsEnumerated] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);
  const [constraintState, setConstraintState] = useState<MicConstraintState>({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  });

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const hasStream = useMemo(() => !!streamRef.current, []);

  const stopMeter = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    stopMeter();
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setSampleRate(null);
    setLevel(0);
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
    }
  }, [stopMeter]);

  const enumerate = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const mics = list.filter((d) => d.kind === "audioinput");
      setDevices(mics);
      setIsEnumerated(true);
      if (!selectedDeviceId) {
        const preferred = localStorage.getItem("preferredMicId");
        if (preferred && mics.some((d) => d.deviceId === preferred)) {
          setSelectedDeviceId(preferred);
        } else if (mics[0]) {
          setSelectedDeviceId(mics[0].deviceId);
        }
      } else if (!mics.some((d) => d.deviceId === selectedDeviceId)) {
        // Previously selected device disappeared
        if (mics[0]) setSelectedDeviceId(mics[0].deviceId);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to enumerate audio devices.");
    }
  }, [selectedDeviceId]);

  const startMeter = useCallback((stream: MediaStream) => {
    stopMeter();
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);
      setSampleRate(ctx.sampleRate);

      const buffer = new Float32Array(analyser.fftSize);
      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = buffer[i];
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        const pct = Math.min(1, Math.max(0, rms * 3)); // amplify a bit for visibility
        setLevel(pct);
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e: any) {
      // Meter is optional; ignore errors gracefully
    }
  }, [stopMeter]);

  const attachStreamToAudio = useCallback((stream: MediaStream) => {
    const audioEl = audioElRef.current;
    if (!audioEl) return;
    audioEl.srcObject = stream as any;
    audioEl.muted = !monitor; // default muted unless monitoring
    audioEl.play().catch(() => {});
  }, [monitor]);

  const getConstraints = useCallback((): MediaStreamConstraints => {
    const deviceId = selectedDeviceId && selectedDeviceId !== "default" ? { exact: selectedDeviceId } : undefined;
    return {
      audio: {
        deviceId,
        echoCancellation: constraintState.echoCancellation,
        noiseSuppression: constraintState.noiseSuppression,
        autoGainControl: constraintState.autoGainControl,
        channelCount: 1,
      },
      video: false,
    } as MediaStreamConstraints;
  }, [selectedDeviceId, constraintState]);

  const requestAccess = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      stopStream();
      const constraints = getConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      attachStreamToAudio(stream);
      startMeter(stream);
      try {
        // labels are only available after permission
        await enumerate();
      } catch {}
      setPermission("granted");
      if (selectedDeviceId) localStorage.setItem("preferredMicId", selectedDeviceId);
    } catch (e: any) {
      const msg = e?.message || "Microphone permission or capture failed.";
      setError(msg);
      setPermission("denied");
    } finally {
      setLoading(false);
    }
  }, [attachStreamToAudio, enumerate, getConstraints, selectedDeviceId, stopStream, startMeter]);

  const handlePermissionCheck = useCallback(async () => {
    if (!("permissions" in navigator) || !(navigator as any).permissions?.query) {
      setPermission("unsupported");
      return;
    }
    try {
      // Some browsers may not support 'microphone' name; fallback to request flow
      // @ts-ignore
      const status: PermissionStatus = await (navigator as any).permissions.query({ name: "microphone" });
      setPermission(status.state as PermissionState);
      status.onchange = () => setPermission(status.state as PermissionState);
    } catch {
      setPermission("unsupported");
    }
  }, []);

  const refreshDevices = useCallback(async () => {
    await enumerate();
  }, [enumerate]);

  const handleDeviceChange = useCallback(async () => {
    await enumerate();
    // If we already have a stream and the device changed, re-acquire with new device
    if (streamRef.current) {
      await requestAccess();
    }
  }, [enumerate, requestAccess]);

  const startRecording = useCallback(() => {
    setError(null);
    if (!streamRef.current) {
      setError("No active microphone stream. Click 'Grant microphone access' first.");
      return;
    }
    try {
      recordedChunksRef.current = [];
      const mr = new MediaRecorder(streamRef.current, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setIsRecording(false);
      };
      mr.start();
      setIsRecording(true);
    } catch (e: any) {
      setError(e?.message || "Failed to start recording.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
    }
  }, []);

  useEffect(() => {
    handlePermissionCheck();
    enumerate();

    const onlineHandler = () => setIsOnline(true);
    const offlineHandler = () => setIsOnline(false);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);

    const deviceChangeHandler = () => {
      handleDeviceChange();
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", deviceChangeHandler);

    const preferred = localStorage.getItem("preferredMicId");
    if (preferred) setSelectedDeviceId(preferred);

    return () => {
      stopRecording();
      stopStream();
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
      navigator.mediaDevices?.removeEventListener?.("devicechange", deviceChangeHandler);
      const prev = recordUrl;
      if (prev) URL.revokeObjectURL(prev);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Persist selected device
    if (selectedDeviceId) {
      localStorage.setItem("preferredMicId", selectedDeviceId);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    // Update monitor mute state
    const audioEl = audioElRef.current;
    if (audioEl) {
      audioEl.muted = !monitor;
      if (monitor) {
        audioEl.play().catch(() => {});
      }
    }
  }, [monitor]);

  const permissionAlert = () => {
    if (permission === "granted") return null;
    if (permission === "unsupported") {
      return (
        <Alert className="bg-muted border-input">
          <AlertTitle>Permission status unavailable</AlertTitle>
          <AlertDescription>
            Your browser does not expose microphone permission status. Click the "Grant microphone access" button below to continue.
          </AlertDescription>
        </Alert>
      );
    }
    if (permission === "denied") {
      return (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertTitle>Microphone blocked</AlertTitle>
          <AlertDescription>
            Microphone access is denied. Please enable microphone access in your browser settings and reload this page.
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <Alert className="bg-primary/5 border-input">
        <AlertTitle>Microphone permission required</AlertTitle>
        <AlertDescription>
          Click the button below to grant microphone access so we can list your devices and test audio input.
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audio & Devices</h1>
          <p className="text-sm text-muted-foreground">Configure your microphone for real-time capture. When you’re ready, start a new session.</p>
        </div>
        <Link href="/sessions/new" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          Start new session
        </Link>
      </div>

      {!isOnline && (
        <Alert className="bg-muted border-input">
          <AlertTitle>Offline</AlertTitle>
          <AlertDescription>Some functionality is limited while offline. You can still test your microphone; recordings will sync when back online.</AlertDescription>
        </Alert>
      )}

      {permissionAlert()}

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertTitle>Issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border border-input bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-medium">Microphone</h2>
              <p className="text-xs text-muted-foreground">Select your preferred input and validate levels below.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={requestAccess}
                disabled={loading}
                className={cn(
                  "inline-flex items-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  loading && "opacity-70 cursor-not-allowed"
                )}
              >
                {permission === "granted" ? "Re-grant / Refresh" : "Grant microphone access"}
              </button>
              <button
                onClick={refreshDevices}
                className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
              >
                Refresh devices
              </button>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Input device</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {!isEnumerated && <option value="">Allow access to list microphones…</option>}
                {devices.map((d, idx) => (
                  <option key={d.deviceId || idx} value={d.deviceId}>
                    {d.label || `Microphone ${idx + 1}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Your choice is saved for future sessions.</p>

              <div className="mt-4 space-y-2">
                <label className="text-sm font-medium">Capture options</label>
                <div className="flex flex-col gap-2 rounded-md border border-input p-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={constraintState.echoCancellation}
                      onChange={(e) => setConstraintState((s) => ({ ...s, echoCancellation: e.target.checked }))}
                    />
                    Echo cancellation
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={constraintState.noiseSuppression}
                      onChange={(e) => setConstraintState((s) => ({ ...s, noiseSuppression: e.target.checked }))}
                    />
                    Noise suppression
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={constraintState.autoGainControl}
                      onChange={(e) => setConstraintState((s) => ({ ...s, autoGainControl: e.target.checked }))}
                    />
                    Auto gain control
                  </label>
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={requestAccess}
                      className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                      Apply and re-capture
                    </button>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={monitor}
                        onChange={(e) => setMonitor(e.target.checked)}
                      />
                      Monitor through speakers
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Live input level</label>
              <div className="rounded-md border border-input bg-muted/30 p-4">
                <div className="h-3 w-full rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-3 rounded-full transition-all",
                      level < 0.6 ? "bg-chart-1" : level < 0.85 ? "bg-chart-3" : "bg-destructive"
                    )}
                    style={{ width: `${Math.round(level * 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Level: {Math.round(level * 100)}%</span>
                  <span>Sample rate: {sampleRate ? `${sampleRate} Hz` : "—"}</span>
                </div>
                <audio ref={audioElRef} className="mt-3 w-full" controls />
              </div>

              <div className="flex gap-2">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={!streamRef.current}
                    className={cn(
                      "inline-flex items-center rounded-md bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:opacity-90",
                      !streamRef.current && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    Record 5s test clip
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="inline-flex items-center rounded-md bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground"
                  >
                    Stop recording
                  </button>
                )}
                {isRecording && (
                  <span className="text-xs text-muted-foreground self-center">Recording… Speak now</span>
                )}
              </div>

              {recordUrl && (
                <div className="rounded-md border border-input p-3">
                  <div className="mb-2 text-sm font-medium">Playback your test recording</div>
                  <audio src={recordUrl} controls className="w-full" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-lg border border-input bg-card p-4">
            <h3 className="text-sm font-semibold">Next steps</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link className="text-primary hover:underline" href="/sessions/new">Start a new live session</Link>
              </li>
              <li>
                <Link className="text-primary hover:underline" href="/ingest/upload">Upload a recording</Link>
              </li>
              <li>
                <Link className="text-primary hover:underline" href="/integrations/zoom">Connect Zoom</Link>
                <span className="text-muted-foreground"> or </span>
                <Link className="text-primary hover:underline" href="/integrations/teams">Teams</Link>
              </li>
              <li>
                <Link className="text-primary hover:underline" href="/consent/new">Create a consent form</Link>
              </li>
              <li>
                <Link className="text-primary hover:underline" href="/help">Visit Help Center</Link>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-input bg-card p-4">
            <h3 className="text-sm font-semibold">Tips</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-xs text-muted-foreground">
              <li>Use a headset to avoid echo and feedback when monitoring.</li>
              <li>If your mic label is empty, click "Grant microphone access" so the browser reveals device names.</li>
              <li>Switch microphones from the dropdown and click "Apply and re-capture" to confirm levels.</li>
              <li>For organization-wide defaults and retention, visit <Link className="text-primary hover:underline" href="/org/settings">Org Settings</Link>.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-input bg-card p-4">
            <h3 className="text-sm font-semibold">Related settings</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
              <Link className="rounded-md border border-input px-3 py-2 hover:bg-accent hover:text-accent-foreground" href="/settings/profile">Profile</Link>
              <Link className="rounded-md border border-input px-3 py-2 hover:bg-accent hover:text-accent-foreground" href="/settings/notifications">Notifications</Link>
              <Link className="rounded-md border border-input px-3 py-2 hover:bg-accent hover:text-accent-foreground" href="/org/security">Org Security</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-input bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Ready to capture?</h3>
            <p className="text-xs text-muted-foreground">Once your levels look good, proceed to create a session. You can add highlights live and generate summaries after.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/sessions/new" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              Start new session
            </Link>
            <Link href="/sessions" className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
              View sessions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
