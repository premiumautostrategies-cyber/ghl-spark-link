import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";
import { Panel, SectionTitle, Tag } from "@/components/os-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { label } from "@/lib/format";
import { PRODUCTION_PHASES, QC_TEMPLATE } from "@/lib/shop";
import { logOpsAlert, OPS_ALERTS_KEY } from "@/lib/ops-alerts";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Camera, Check, ChevronDown, ClipboardCheck, Images, Pause, Play, ShieldAlert } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({
    meta: [
      { title: "My Work — Systemize" },
      { name: "description", content: "Mobile-first technician schedule, work orders, checklists, completion, and QC handoff." },
      { property: "og:title", content: "My Work — Systemize" },
      { property: "og:description", content: "Mobile-first technician schedule, work orders, checklists, completion, and QC handoff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TechnicianProductionPage,
});

type Phase = {
  id: string;
  job_id: string;
  phase: string;
  sequence: number;
  status: string;
  estimated_hours: number | string;
  actual_minutes: number | string;
  assigned_to: string | null;
  started_at: string | null;
};

type Inspection = {
  id: string;
  job_id: string | null;
  status: string;
  mileage: number | null;
  notes: string | null;
};

type CompletionItem = {
  id: string;
  job_id: string;
  phase: string;
  label: string;
  item_kind: string;
  is_required: boolean;
  is_complete: boolean;
};

const PREP_PHASES = ["wash_prep", "plot_cut"];
const INSTALL_PHASES = ["install", "reassembly"];

function installAreas(serviceType: string) {
  const service = serviceType.toLowerCase();
  if (service.includes("full front") || service.includes("ppf")) {
    return ["Hood", "Left fender", "Right fender", "Front bumper", "Mirrors"];
  }
  if (service.includes("tint")) {
    return ["Windshield", "Driver front", "Passenger front", "Driver rear", "Passenger rear", "Rear glass"];
  }
  if (service.includes("wrap")) {
    return ["Front", "Driver side", "Passenger side", "Roof", "Rear"];
  }
  return [serviceType || "Primary service"];
}

const STEPS = [
  { key: "accept", label: "Accept" },
  { key: "checkin", label: "Check in" },
  { key: "inspection", label: "Inspection" },
  { key: "prep", label: "Prep" },
  { key: "install", label: "Install" },
  { key: "qc", label: "QC" },
] as const;

function clock(value: string | null) {
  return value ? new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Unscheduled";
}

function TechnicianProductionPage() {
  const qc = useQueryClient();
  const { orgId, locId, roleNames, teamMember } = useOrg();
  const [openJob, setOpenJob] = useState<string | null>(null);
  const [tech, setTech] = useState(teamMember?.full_name ?? "");
  const [scheduleView, setScheduleView] = useState<"today" | "upcoming" | "completed">("today");
  const [liveOpen, setLiveOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [completionNotes, setCompletionNotes] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  const [completionFiles, setCompletionFiles] = useState<File[]>([]);
  const [finalConfirmed, setFinalConfirmed] = useState(false);

  const { data: jobs = [] } = useQuery({
    queryKey: ["floor-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "*, customers(name,phone), vehicles(year,make,model,color,plate), inventory_rolls(roll_code,lot_number,product_line), job_services(description,quantity)",
        )
        .in("status", ["scheduled", "in_progress", "ready_for_pickup", "completed"])
        .is("deleted_at", null)
        .order("scheduled_start");
      if (error) throw error;
      return data;
    },
  });

  const { data: team = [] } = useQuery({
    queryKey: ["floor-team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id,full_name,is_active,user_id")
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: phases = [] } = useQuery({
    queryKey: ["job-phases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_phases")
        .select("id,job_id,phase,sequence,status,estimated_hours,actual_minutes,assigned_to,started_at")
        .order("sequence");
      if (error) throw error;
      return data as Phase[];
    },
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ["floor-inspections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspections")
        .select("id,job_id,status,mileage,notes,inspection_defects(panel,defect_type,severity,note)");
      if (error) throw error;
      return data as unknown as (Inspection & { inspection_defects: { panel: string; defect_type: string; severity: string; note: string | null }[] })[];
    },
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ["floor-qc"],
    queryFn: async () => {
      const { data, error } = await supabase.from("qc_checklists").select("id,job_id,status");
      if (error) throw error;
      return data;
    },
  });

  const { data: completionItems = [] } = useQuery({
    queryKey: ["installer-completion-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installer_completion_items")
        .select("id,job_id,phase,label,item_kind,is_required,is_complete")
        .order("sort_order");
      if (error) throw error;
      return data as CompletionItem[];
    },
  });

  const { data: jobDocuments = [] } = useQuery({
    queryKey: ["installer-job-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id,job_id,name,doc_type,file_url,body,created_at")
        .in("doc_type", ["installer_photo", "installer_completion", "installer_issue"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const photoPaths = useMemo(
    () => jobDocuments.filter((d) => d.doc_type === "installer_photo" && d.file_url).map((d) => d.file_url as string),
    [jobDocuments],
  );

  const { data: photoUrls = {} } = useQuery({
    queryKey: ["installer-photo-urls", photoPaths],
    enabled: photoPaths.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("job-documentation").createSignedUrls(photoPaths, 3600);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((row) => {
        if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
      });
      return map;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["floor-jobs"] });
    qc.invalidateQueries({ queryKey: ["job-phases"] });
    qc.invalidateQueries({ queryKey: ["floor-inspections"] });
    qc.invalidateQueries({ queryKey: ["floor-qc"] });
    qc.invalidateQueries({ queryKey: ["installer-completion-items"] });
    qc.invalidateQueries({ queryKey: ["installer-job-documents"] });
    qc.invalidateQueries({ queryKey: OPS_ALERTS_KEY });
  };

  const techNames = useMemo(() => {
    const fromTeam = team.filter((t) => t.is_active !== false).map((t) => t.full_name).filter(Boolean) as string[];
    const fromJobs = jobs.map((j) => j.installer).filter(Boolean) as string[];
    return Array.from(new Set([...fromTeam, ...fromJobs]));
  }, [team, jobs]);

  const isTechnician = (roleNames ?? []).some((name) => /technician|installer/i.test(name));
  useEffect(() => {
    if (teamMember?.full_name && tech !== teamMember.full_name) setTech(teamMember.full_name);
    else if (!tech && !isTechnician && techNames[0]) setTech(techNames[0]);
  }, [tech, techNames, teamMember, isTechnician]);

  const { data: openShift = null } = useQuery({
    queryKey: ["technician-shift", teamMember?.id, tech],
    enabled: Boolean(orgId && (teamMember?.id || tech)),
    queryFn: async () => {
      let query = supabase.from("time_entries").select("id,started_at,ended_at,minutes").is("job_id", null).is("job_phase_id", null).is("ended_at", null).order("started_at", { ascending: false }).limit(1);
      query = teamMember?.id ? query.eq("team_member_id", teamMember.id) : query.eq("tech_name", tech);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const shift = useMutation({
    mutationFn: async () => {
      if (!orgId || !tech) throw new Error("Technician identity is required");
      const now = new Date();
      if (openShift) {
        const minutes = Math.max(1, Math.round((now.getTime() - new Date(openShift.started_at).getTime()) / 60000));
        const { error } = await supabase.from("time_entries").update({ ended_at: now.toISOString(), minutes }).eq("id", openShift.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("time_entries").insert({ organization_id: orgId, team_member_id: teamMember?.id ?? null, tech_name: tech, started_at: now.toISOString(), note: "Shop shift" });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(openShift ? "Clocked out" : "Clocked in"); qc.invalidateQueries({ queryKey: ["technician-shift"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const acceptJob = useMutation({
    mutationFn: async (jobId: string) => {
      if (!tech) throw new Error("Pick your name first");
      const { error } = await supabase
        .from("jobs")
        .update({ installer: tech, accepted_by: tech, accepted_at: new Date().toISOString() })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job accepted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkIn = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("jobs")
        .update({ checked_in_at: new Date().toISOString(), status: "in_progress" })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle checked in");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startInspection = useMutation({
    mutationFn: async (jobId: string) => {
      if (!orgId) throw new Error("No workspace selected");
      const job = jobs.find((j) => j.id === jobId);
      const { error } = await supabase.from("inspections").insert({
        organization_id: orgId,
        location_id: locId,
        job_id: jobId,
        customer_id: job?.customer_id ?? null,
        vehicle_id: job?.vehicle_id ?? null,
        inspector: tech || null,
        stage: "check_in",
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inspection started");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completeInspection = useMutation({
    mutationFn: async ({ id, mileage, notes }: { id: string; mileage: string; notes: string }) => {
      const { error } = await supabase
        .from("inspections")
        .update({
          mileage: mileage ? Number(mileage) : null,
          notes: notes || null,
          status: "completed",
          inspector: tech || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inspection complete");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const seedPhases = useMutation({
    mutationFn: async (jobId: string) => {
      if (!orgId) throw new Error("No workspace selected");
      const job = jobs.find((j) => j.id === jobId);
      const total = Number(job?.estimated_hours) || 6;
      const rows = PRODUCTION_PHASES.map((p, i) => ({
        organization_id: orgId,
        job_id: jobId,
        phase: p.key,
        sequence: i,
        estimated_hours: Math.round((total * (p.hours / 7.5)) * 10) / 10 || p.hours,
        assigned_to: job?.installer ?? tech ?? null,
      }));
      const { error } = await supabase.from("job_phases").insert(rows);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const setPhase = useMutation({
    mutationFn: async ({ phase, action }: { phase: Phase; action: "start" | "pause" | "complete" }) => {
      const now = new Date();
      const elapsed = phase.started_at ? (now.getTime() - new Date(phase.started_at).getTime()) / 60000 : 0;
      if (action === "start") {
        const { error } = await supabase
          .from("job_phases")
          .update({ status: "active", started_at: now.toISOString() })
          .eq("id", phase.id);
        if (error) throw error;
        return;
      }
      const minutes = Math.round(Number(phase.actual_minutes) + elapsed);
      const { error } = await supabase
        .from("job_phases")
        .update({
          status: action === "pause" ? "paused" : "complete",
          actual_minutes: minutes,
          started_at: null,
          ...(action === "complete" ? { completed_at: now.toISOString() } : {}),
        })
        .eq("id", phase.id);
      if (error) throw error;
      if (orgId && elapsed > 0) {
        await supabase.from("time_entries").insert({
          organization_id: orgId,
          job_phase_id: phase.id,
          tech_name: phase.assigned_to ?? tech,
          minutes: Math.round(elapsed),
          ended_at: now.toISOString(),
        });
      }
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const completePhaseGroup = useMutation({
    mutationFn: async ({ jobId, keys, areaLabels = [] }: { jobId: string; keys: string[]; areaLabels?: string[] }) => {
      if (!orgId) throw new Error("No workspace selected");
      const jobRow = jobs.find((item) => item.id === jobId);
      let rows = phases.filter((phase) => phase.job_id === jobId);
      if (rows.length === 0) {
        const total = Number(jobRow?.estimated_hours) || 6;
        const { data, error } = await supabase.from("job_phases").insert(
          PRODUCTION_PHASES.map((phase, index) => ({
            organization_id: orgId,
            job_id: jobId,
            phase: phase.key,
            sequence: index,
            estimated_hours: Math.round((total * (phase.hours / 7.5)) * 10) / 10 || phase.hours,
            assigned_to: jobRow?.installer ?? tech ?? null,
          })),
        ).select("id,job_id,phase,sequence,status,estimated_hours,actual_minutes,assigned_to,started_at");
        if (error) throw error;
        rows = data as Phase[];
      }
      const targetIds = rows.filter((phase) => keys.includes(phase.phase)).map((phase) => phase.id);
      if (targetIds.length) {
        const { error } = await supabase
          .from("job_phases")
          .update({ status: "complete", started_at: null, completed_at: new Date().toISOString() })
          .in("id", targetIds);
        if (error) throw error;
      }
      if (areaLabels.length) {
        const { error } = await supabase.from("installer_completion_items").upsert(
          areaLabels.map((area, index) => ({
            organization_id: orgId,
            job_id: jobId,
            phase: "install",
            label: area,
            item_kind: "install_area",
            is_complete: true,
            completed_at: new Date().toISOString(),
            completed_by: tech || null,
            sort_order: index,
          })),
          { onConflict: "job_id,phase,item_kind,label" },
        );
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      toast.success(variables.keys.includes("install") ? "Install marked complete" : "Prep marked complete");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveCompletion = useMutation({
    mutationFn: async ({ jobId }: { jobId: string }) => {
      if (!orgId || !finalConfirmed) throw new Error("Confirm the final checklist before submitting");
      const jobRow = jobs.find((item) => item.id === jobId);
      const areas = installAreas(jobRow?.service_type ?? "Service");
      const now = new Date().toISOString();
      const { error: itemError } = await supabase.from("installer_completion_items").upsert(
        areas.map((area, index) => ({
          organization_id: orgId,
          job_id: jobId,
          phase: "install",
          label: area,
          item_kind: "install_area",
          is_complete: selectedAreas.includes(area),
          completed_at: selectedAreas.includes(area) ? now : null,
          completed_by: selectedAreas.includes(area) ? tech || null : null,
          sort_order: index,
        })),
        { onConflict: "job_id,phase,item_kind,label" },
      );
      if (itemError) throw itemError;
      if (selectedAreas.length !== areas.length) throw new Error("Finish or select every install area before submitting to QC");

      for (const file of completionFiles) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${orgId}/${jobId}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("job-documentation").upload(path, file);
        if (uploadError) throw uploadError;
        const { error: docError } = await supabase.from("documents").insert({
          organization_id: orgId,
          location_id: locId,
          customer_id: jobRow?.customer_id ?? null,
          vehicle_id: jobRow?.vehicle_id ?? null,
          job_id: jobId,
          name: file.name,
          doc_type: "installer_photo",
          status: "complete",
          file_url: path,
        });
        if (docError) throw docError;
      }
      const documentation = [
        completionNotes.trim() ? { name: "Installer completion notes", doc_type: "installer_completion", body: completionNotes.trim() } : null,
        issueNotes.trim() ? { name: "Installer reported issue", doc_type: "installer_issue", body: issueNotes.trim() } : null,
      ].filter((row): row is { name: string; doc_type: string; body: string } => Boolean(row));
      if (documentation.length) {
        const { error } = await supabase.from("documents").insert(documentation.map((row) => ({
          ...row,
          organization_id: orgId,
          location_id: locId,
          customer_id: jobRow?.customer_id ?? null,
          vehicle_id: jobRow?.vehicle_id ?? null,
          job_id: jobId,
          status: "complete",
        })));
        if (error) throw error;
      }
      await completePhaseGroup.mutateAsync({ jobId, keys: INSTALL_PHASES, areaLabels: areas });
    },
    onSuccess: (_, variables) => {
      setCompletionOpen(false);
      setCompletionFiles([]);
      setCompletionNotes("");
      setIssueNotes("");
      setFinalConfirmed(false);
      requestQc.mutate(variables.jobId);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadPhotos = useMutation({
    mutationFn: async ({ jobId, files }: { jobId: string; files: File[] }) => {
      if (!orgId) throw new Error("No workspace selected");
      if (!files.length) return;
      const jobRow = jobs.find((item) => item.id === jobId);
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${orgId}/${jobId}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("job-documentation").upload(path, file);
        if (uploadError) throw uploadError;
        const { error: docError } = await supabase.from("documents").insert({
          organization_id: orgId,
          location_id: locId,
          customer_id: jobRow?.customer_id ?? null,
          vehicle_id: jobRow?.vehicle_id ?? null,
          job_id: jobId,
          name: file.name,
          doc_type: "installer_photo",
          status: "complete",
          file_url: path,
        });
        if (docError) throw docError;
      }
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.files.length} photo${variables.files.length === 1 ? "" : "s"} uploaded`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const requestQc = useMutation({
    mutationFn: async (jobId: string) => {
      if (!orgId) throw new Error("No workspace selected");
      const job = jobs.find((j) => j.id === jobId);
      let checklistId = checklists.find((c) => c.job_id === jobId)?.id ?? null;
      if (!checklistId) {
        const { data, error } = await supabase
          .from("qc_checklists")
          .insert({ organization_id: orgId, job_id: jobId })
          .select("id")
          .single();
        if (error) throw error;
        checklistId = data.id;
        const { error: e2 } = await supabase.from("qc_items").insert(
          QC_TEMPLATE.map((t, i) => ({
            organization_id: orgId,
            checklist_id: data.id,
            label: t.label,
            kind: t.kind,
            is_required: t.required,
            sort_order: i,
          })),
        );
        if (e2) throw e2;
      } else {
        await supabase.from("qc_checklists").update({ status: "pending" }).eq("id", checklistId);
      }
      const { error: e3 } = await supabase.from("jobs").update({ qc_status: "in_review" }).eq("id", jobId);
      if (e3) throw e3;
      await logOpsAlert({
        organizationId: orgId,
        jobId,
        kind: "qc_requested",
        title: `QC requested — ${job?.title ?? "vehicle"}`,
        body: `${tech || "Installer"} finished install on ${job?.customers?.name ?? "the vehicle"}.`,
        actor: tech || null,
      });
    },
    onSuccess: () => {
      toast.success("QC requested — sales notified");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const job = jobs.find((j) => j.id === openJob) ?? null;

  const stepsFor = (jobId: string, jobRow: (typeof jobs)[number]) => {
    const mine = phases.filter((p) => p.job_id === jobId);
    const inspection = inspections.find((i) => i.job_id === jobId) ?? null;
    const phaseDone = (keys: string[]) => {
      const rows = mine.filter((p) => keys.includes(p.phase));
      return rows.length > 0 && rows.every((p) => p.status === "complete");
    };
    return {
      phases: mine,
      inspection,
      accept: Boolean(jobRow.accepted_at),
      checkin: Boolean(jobRow.checked_in_at),
      inspectionDone: ["completed", "signed"].includes(inspection?.status ?? ""),
      prep: phaseDone(PREP_PHASES),
      install: phaseDone(INSTALL_PHASES),
      qc: ["in_review", "passed", "failed"].includes(jobRow.qc_status ?? ""),
      qcFailed: jobRow.qc_status === "failed",
      qcPassed: jobRow.qc_status === "passed",
    };
  };

  if (job) {
    const s = stepsFor(job.id, job);
    const done = [s.accept, s.checkin, s.inspectionDone, s.prep, s.install, s.qc].filter(Boolean).length;
    const currentIndex = [s.accept, s.checkin, s.inspectionDone, s.prep, s.install, s.qc].findIndex((v) => !v);
    const vehicle = [job.vehicles?.year, job.vehicles?.make, job.vehicles?.model].filter(Boolean).join(" ") || job.title;
    const areas = installAreas(job.service_type);
    const savedAreas = completionItems.filter((item) => item.job_id === job.id && item.phase === "install");
    const completedAreaNames = savedAreas.filter((item) => item.is_complete).map((item) => item.label);
    const documents = jobDocuments.filter((document) => document.job_id === job.id);
    const services = job.job_services?.length
      ? job.job_services.map((service) => service.description)
      : [label(job.service_type)];
    const openCompletion = () => {
      setSelectedAreas(completedAreaNames.length ? completedAreaNames : []);
      setCompletionOpen(true);
    };

    return (
      <div className="mx-auto max-w-3xl space-y-4 pb-28">
        <Button variant="ghost" className="min-h-12" onClick={() => setOpenJob(null)}>
          <ArrowLeft className="mr-2 h-5 w-5" /> My work
        </Button>

        {s.qcFailed && (
          <div className="flex items-start gap-3 rounded-xl border border-critical/50 bg-critical/10 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-critical" />
            <div>
              <p className="text-sm font-semibold text-critical">QC sent this vehicle back</p>
              <p className="mt-1 text-sm text-muted-foreground">Correct the flagged work, then request QC again.</p>
            </div>
          </div>
        )}

        <Panel className="p-5 sm:p-6">
          <p className="micro-label">{clock(job.scheduled_start)} · {job.bay ?? "No bay"}</p>
          <h1 className="display-title mt-2 text-2xl sm:text-3xl">{vehicle}</h1>
          <p className="mt-2 text-base font-medium">Work order</p>
          <dl className="mt-5 grid gap-3 border-t border-elevated pt-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-muted-foreground">Customer</dt><dd className="mt-1 font-medium">{job.customers?.name ?? "No customer"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Plate / color</dt><dd className="mt-1 font-medium">{[job.vehicles?.plate, job.vehicles?.color].filter(Boolean).join(" · ") || "—"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Services / coverage</dt><dd className="mt-1 font-medium">{services.join(" · ")}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Product / film</dt><dd className="mt-1 font-medium">{job.inventory_rolls ? [job.inventory_rolls.product_line, job.inventory_rolls.roll_code].filter(Boolean).join(" · ") : "Not assigned"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Due</dt><dd className="mt-1 font-medium">{clock(job.scheduled_end ?? job.scheduled_start)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Instructions</dt><dd className="mt-1 whitespace-pre-line font-medium">{job.notes || "No special instructions"}</dd></div>
          </dl>

          <ol className="mt-5 flex flex-wrap gap-2 border-t border-elevated pt-4">
            {STEPS.map((step, i) => {
              const complete = [s.accept, s.checkin, s.inspectionDone, s.prep, s.install, s.qc][i];
              const active = i === currentIndex;
              return (
                <li
                  key={step.key}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-semibold",
                    complete
                      ? "border-revenue/40 bg-revenue/10 text-revenue"
                      : active
                        ? "border-bronze bg-bronze/10 text-bronze"
                        : "border-elevated text-muted-foreground",
                  )}
                >
                  {i + 1}. {step.label}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">{done} of {STEPS.length} milestones complete</p>
        </Panel>

        <div className="rounded-xl border border-bronze/40 bg-bronze/5 p-4 sm:p-5">
          <p className="text-base font-semibold">Work your way</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep this page open for reference, then document everything at the end. Live timers and individual updates are optional.
          </p>
        </div>

        {/* Step 1–2 */}
        <Panel className="p-5">
          <p className="micro-label">Start of day</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Button size="lg" className="min-h-14" disabled={s.accept || acceptJob.isPending} onClick={() => acceptJob.mutate(job.id)}>
              {s.accept ? `Accepted${job.accepted_by ? ` by ${job.accepted_by}` : ""}` : "Accept this job"}
            </Button>
            <Button size="lg" variant={s.accept && !s.checkin ? "default" : "outline"} className="min-h-14" disabled={!s.accept || s.checkin || checkIn.isPending} onClick={() => checkIn.mutate(job.id)}>
              {s.checkin ? `Checked in ${clock(job.checked_in_at)}` : "Check in vehicle"}
            </Button>
          </div>
        </Panel>

        {/* Inspection */}
        <Panel>
          <SectionTitle title="Intake inspection" hint="Log condition before any film touches the car" right={<Link to="/inspections" className="text-xs text-comms underline">Full panel map</Link>} />
          <div className="border-t border-elevated p-4 sm:p-5">
            {!s.checkin ? (
              <p className="text-sm text-muted-foreground">Check the vehicle in to start the inspection.</p>
            ) : !s.inspection ? (
              <Button size="lg" className="min-h-14 w-full" disabled={startInspection.isPending} onClick={() => startInspection.mutate(job.id)}>
                Start inspection
              </Button>
            ) : s.inspectionDone ? (
              <div className="space-y-2">
                <Tag tone="revenue">Inspection complete</Tag>
                <p className="text-sm text-muted-foreground">
                  {s.inspection.mileage ? `${s.inspection.mileage} mi · ` : ""}{s.inspection.notes || "No condition notes."}
                </p>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  completeInspection.mutate({
                    id: s.inspection!.id,
                    mileage: String(f.get("mileage") || ""),
                    notes: String(f.get("notes") || ""),
                  });
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="mileage" className="text-xs">Mileage</Label>
                  <Input id="mileage" name="mileage" type="number" inputMode="numeric" className="min-h-12" defaultValue={s.inspection.mileage ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs">Condition notes & pre-existing damage</Label>
                  <Textarea id="notes" name="notes" rows={3} defaultValue={s.inspection.notes ?? ""} placeholder="Rock chips on hood, swirls on driver door…" />
                </div>
                <Button type="submit" size="lg" className="min-h-14 w-full" disabled={completeInspection.isPending}>
                  Complete inspection
                </Button>
              </form>
            )}
          </div>
        </Panel>

        {/* Prep & install */}
        <Panel>
          <SectionTitle title="Prep & install" hint="Complete each phase at the end, or optionally track it live" />
          <div className="space-y-3 border-t border-elevated p-4 sm:p-5">
            {!s.inspectionDone ? (
              <p className="text-sm text-muted-foreground">Finish the inspection to open production steps.</p>
            ) : s.phases.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Set up the work order once. You do not need to keep this screen open while working.</p>
                <Button size="lg" className="min-h-14 w-full" disabled={seedPhases.isPending} onClick={() => seedPhases.mutate(job.id)}>
                  Begin work
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-elevated bg-surface-2 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="font-semibold">Prep</p><p className="text-xs text-muted-foreground">Wash, prep, plot and cut</p></div>
                      <Tag tone={s.prep ? "revenue" : "muted"}>{s.prep ? "Complete" : "Open"}</Tag>
                    </div>
                    {!s.prep && (
                      <Button size="lg" className="mt-4 min-h-14 w-full" disabled={completePhaseGroup.isPending} onClick={() => completePhaseGroup.mutate({ jobId: job.id, keys: PREP_PHASES })}>
                        Mark prep complete
                      </Button>
                    )}
                  </div>
                  <div className="rounded-xl border border-elevated bg-surface-2 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="font-semibold">Install</p><p className="text-xs text-muted-foreground">{areas.join(" · ")}</p></div>
                      <Tag tone={s.install ? "revenue" : "muted"}>{s.install ? "Complete" : "Open"}</Tag>
                    </div>
                    {!s.install && (
                      <Button size="lg" className="mt-4 min-h-14 w-full" disabled={!s.prep || completePhaseGroup.isPending} onClick={() => completePhaseGroup.mutate({ jobId: job.id, keys: INSTALL_PHASES, areaLabels: areas })}>
                        Mark install complete
                      </Button>
                    )}
                  </div>
                </div>

                <button type="button" className="flex min-h-12 w-full items-center justify-between rounded-lg border border-elevated px-4 text-left text-sm font-medium" onClick={() => setLiveOpen((value) => !value)}>
                  Optional live progress
                  <ChevronDown className={cn("h-4 w-4 transition-transform", liveOpen && "rotate-180")} />
                </button>
                {liveOpen && s.phases.map((p) => {
                  const est = Number(p.estimated_hours) * 60;
                  const actual = Number(p.actual_minutes);
                  const over = actual > est && est > 0;
                  return (
                    <div key={p.id} className={cn("rounded-xl border p-4", p.status === "active" ? "border-bronze bg-bronze/10" : "border-elevated bg-surface-2")}>
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <div className="min-w-0">
                          <p className="font-semibold">{PRODUCTION_PHASES.find((x) => x.key === p.phase)?.label ?? label(p.phase)}</p>
                          <p className={cn("text-xs", over ? "text-critical" : "text-muted-foreground")}>{Math.round(actual)} min logged · {Math.round(est)} min estimated</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {p.status !== "complete" && p.status !== "active" && <Button onClick={() => setPhase.mutate({ phase: p, action: "start" })}><Play className="mr-1.5 h-4 w-4" /> Start</Button>}
                          {p.status === "active" && <Button variant="outline" onClick={() => setPhase.mutate({ phase: p, action: "pause" })}><Pause className="mr-1.5 h-4 w-4" /> Pause</Button>}
                          {p.status !== "complete" && <Button variant="outline" onClick={() => setPhase.mutate({ phase: p, action: "complete" })}><Check className="mr-1.5 h-4 w-4" /> Done</Button>}
                          {p.status === "complete" && <Tag tone="revenue">Complete</Tag>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2">
          <Panel className="p-5">
            <p className="micro-label">Instructions & material</p>
            <p className="mt-2 text-sm">
              {job.inventory_rolls
                ? `${job.inventory_rolls.roll_code} · ${job.inventory_rolls.product_line ?? ""} · lot ${job.inventory_rolls.lot_number ?? "—"}`
                : "No roll assigned"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{Number(job.film_feet_estimate) || 0} ft estimated for this vehicle</p>
            {job.cut_file_url && (
              <a href={job.cut_file_url} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-comms underline">
                Open plot cut file
              </a>
            )}
          </Panel>
          <Panel className="p-5">
            <p className="micro-label">Logged damage</p>
            <ul className="mt-2 space-y-1.5">
              {(s.inspection?.inspection_defects ?? []).map((d, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  <span className={d.severity === "critical" ? "text-critical" : "text-urgent"}>•</span>{" "}
                  {label(d.defect_type)} — {label(d.panel)} {d.note ? `· ${d.note}` : ""}
                </li>
              ))}
              {(s.inspection?.inspection_defects ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">No pre-existing damage logged.</li>
              )}
            </ul>
          </Panel>
          <Panel className="p-5 sm:col-span-2">
            <p className="micro-label">Notes</p>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {job.notes || "No special instructions or technician notes."}
            </p>
          </Panel>
        </div>

        <Panel>
          <SectionTitle title="Job photos" hint="Add photos any time — or all at once when you finish" />
          <div className="space-y-4 border-t border-elevated p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild size="lg" variant="outline" className="min-h-14" disabled={uploadPhotos.isPending}>
                <label>
                  <Camera className="mr-2 h-5 w-5" /> Take photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = "";
                      if (files.length) uploadPhotos.mutate({ jobId: job.id, files });
                    }}
                  />
                </label>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-14" disabled={uploadPhotos.isPending}>
                <label>
                  <Images className="mr-2 h-5 w-5" /> Upload from library
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = "";
                      if (files.length) uploadPhotos.mutate({ jobId: job.id, files });
                    }}
                  />
                </label>
              </Button>
            </div>
            {uploadPhotos.isPending && <p className="text-sm text-muted-foreground">Uploading…</p>}
            {documents.filter((d) => d.doc_type === "installer_photo").length === 0 ? (
              <p className="text-sm text-muted-foreground">No photos on this job yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {documents
                  .filter((d) => d.doc_type === "installer_photo")
                  .map((d) => {
                    const url = d.file_url ? photoUrls[d.file_url] : undefined;
                    return url ? (
                      <a key={d.id} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-elevated">
                        <img src={url} alt={d.name ?? "Job photo"} className="aspect-square w-full object-cover" loading="lazy" />
                      </a>
                    ) : (
                      <div key={d.id} className="aspect-square rounded-lg border border-elevated bg-surface-2" />
                    );
                  })}
              </div>
            )}
          </div>
        </Panel>


        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-elevated bg-background/95 p-3 backdrop-blur">
          {s.qcPassed ? (
        <Button size="lg" className="mx-auto min-h-14 w-full max-w-3xl text-sm font-semibold" disabled>
               QC passed — vehicle ready
             </Button>
          ) : (
            <Button size="lg" className="mx-auto min-h-14 w-full max-w-3xl text-sm font-semibold" disabled={!s.inspectionDone || job.qc_status === "in_review"} onClick={openCompletion}>
              <ClipboardCheck className="mr-2 h-5 w-5" />
              {job.qc_status === "in_review" ? "QC requested — awaiting review" : "Complete documentation"}
            </Button>
          )}
        </div>

        <Dialog open={completionOpen} onOpenChange={setCompletionOpen}>
          <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Complete documentation</DialogTitle>
              <DialogDescription>Review the finished work once, add all documentation, then submit it to QC.</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <section>
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-sm font-semibold">Install areas</p><p className="text-xs text-muted-foreground">Uncheck anything that still needs work.</p></div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedAreas(selectedAreas.length === areas.length ? [] : areas)}>
                    {selectedAreas.length === areas.length ? "Clear all" : "Mark all complete"}
                  </Button>
                </div>
                <div className="mt-3 divide-y divide-elevated rounded-xl border border-elevated">
                  {areas.map((area) => (
                    <label key={area} className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-3">
                      <Checkbox checked={selectedAreas.includes(area)} onCheckedChange={(checked) => setSelectedAreas((current) => checked ? [...new Set([...current, area])] : current.filter((item) => item !== area))} />
                      <span className="text-sm font-medium">{area}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div><p className="text-sm font-semibold">Photos</p><p className="text-xs text-muted-foreground">Add all job photos together. {documents.filter((document) => document.doc_type === "installer_photo").length} already saved.</p></div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild type="button" variant="outline" className="min-h-12">
                    <label><Camera className="mr-2 h-4 w-4" /> Camera<input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(event) => setCompletionFiles((current) => [...current, ...Array.from(event.target.files ?? [])])} /></label>
                  </Button>
                  <Button asChild type="button" variant="outline" className="min-h-12">
                    <label><Images className="mr-2 h-4 w-4" /> Photo library<input type="file" accept="image/*" multiple className="hidden" onChange={(event) => setCompletionFiles((current) => [...current, ...Array.from(event.target.files ?? [])])} /></label>
                  </Button>
                </div>
                {completionFiles.length > 0 && <p className="text-xs text-revenue">{completionFiles.length} photo{completionFiles.length === 1 ? "" : "s"} ready to upload together.</p>}
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="completion-notes">Completion notes</Label><Textarea id="completion-notes" rows={3} value={completionNotes} onChange={(event) => setCompletionNotes(event.target.value)} placeholder="Optional notes for the completed work" /></div>
                <div className="space-y-1.5"><Label htmlFor="issue-notes">Report an issue</Label><Textarea id="issue-notes" rows={3} value={issueNotes} onChange={(event) => setIssueNotes(event.target.value)} placeholder="Leave blank when there are no issues" /></div>
              </section>

              {issueNotes.trim() && <div className="flex items-start gap-2 rounded-lg border border-urgent/40 bg-urgent/10 p-3 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-urgent" /><span>This issue will be attached to the work order for QC review.</span></div>}

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-elevated bg-surface-2 p-4">
                <Checkbox checked={finalConfirmed} onCheckedChange={(checked) => setFinalConfirmed(checked === true)} />
                <span className="text-sm">I reviewed the completed services, install areas, required documentation, and reported issues.</span>
              </label>

              <Button size="lg" className="min-h-14 w-full" disabled={saveCompletion.isPending || !finalConfirmed || selectedAreas.length !== areas.length} onClick={() => saveCompletion.mutate({ jobId: job.id })}>
                <ClipboardCheck className="mr-2 h-5 w-5" /> Submit for QC
              </Button>
              {selectedAreas.length !== areas.length && <p className="text-center text-xs text-muted-foreground">Complete every install area before submitting. You can close this review and return later.</p>}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const assignedJobs = tech ? jobs.filter((item) => item.installer === tech || item.accepted_by === tech) : [];
  const todayKey = new Date().toDateString();
  const visibleJobs = assignedJobs.filter((item) => {
    const scheduled = item.scheduled_start ? new Date(item.scheduled_start) : null;
    if (scheduleView === "completed") return item.status === "completed" || item.qc_status === "passed";
    if (scheduleView === "today") return scheduled?.toDateString() === todayKey && item.status !== "completed";
    return scheduled ? scheduled.getTime() > Date.now() && scheduled.toDateString() !== todayKey : false;
  });

  const JobRow = ({ item }: { item: (typeof jobs)[number] }) => {
    const s = stepsFor(item.id, item);
    const stepDone = [s.accept, s.checkin, s.inspectionDone, s.prep, s.install, s.qc].filter(Boolean).length;
    const vehicle = [item.vehicles?.year, item.vehicles?.make, item.vehicles?.model].filter(Boolean).join(" ") || item.title;
    const next = s.qcFailed ? "QC returned — corrections needed" : item.qc_status === "in_review" ? "Waiting for QC" : !s.checkin ? "Check in vehicle" : !s.inspectionDone ? "Complete inspection" : !s.install ? "Continue work" : "Complete & send to QC";
    return (
      <button type="button" onClick={() => setOpenJob(item.id)} className="grid min-h-28 w-full grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-elevated px-1 py-4 text-left last:border-b-0 sm:grid-cols-[6rem_minmax(0,1fr)_auto]">
        <div className="self-start pt-0.5">
          <p className="text-base font-bold tabular-nums text-bronze">{clock(item.scheduled_start)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.bay || (item.is_mobile ? "Mobile" : "No bay")}</p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold sm:text-lg">{vehicle}</p>
          <p className="mt-1 truncate text-sm">{label(item.service_type)}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{item.customers?.name ?? "No customer"} · {next}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated"><div className="h-full bg-bronze" style={{ width: `${(stepDone / STEPS.length) * 100}%` }} /></div>
        </div>
        <div className="shrink-0 text-right"><span className="text-xs font-semibold tabular-nums">{stepDone}/{STEPS.length}</span><ChevronDown className="ml-auto mt-2 size-5 -rotate-90 text-muted-foreground" /></div>
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="micro-label">Production</p>
          <h1 className="display-title truncate text-2xl sm:text-3xl">My Work</h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">{tech ? `${tech} · ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}` : "No technician profile linked"}</p>
        </div>
        <Button size="lg" variant={openShift ? "outline" : "default"} className="min-h-12 shrink-0" disabled={!tech || shift.isPending} onClick={() => shift.mutate()}>
          {openShift ? "Clock out" : "Clock in"}
        </Button>
      </header>

      {!isTechnician && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-elevated bg-surface px-3 py-2">
          <p className="min-w-0 truncate text-xs text-muted-foreground">Manager preview</p>
          <Select value={tech} onValueChange={(value) => { setTech(value); setOpenJob(null); }}>
            <SelectTrigger className="h-10 w-44"><SelectValue placeholder="Installer" /></SelectTrigger>
            <SelectContent>{techNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-3 rounded-lg border border-elevated bg-surface p-1">
        {(["today", "upcoming", "completed"] as const).map((view) => (
          <Button key={view} variant={scheduleView === view ? "default" : "ghost"} className="min-h-11 capitalize" onClick={() => setScheduleView(view)}>{view}</Button>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-elevated bg-surface px-4 sm:px-5">
        {visibleJobs.length ? visibleJobs.map((item) => <JobRow key={item.id} item={item} />) : (
          <div className="py-14 text-center"><p className="font-semibold">No {scheduleView} work</p><p className="mt-1 text-sm text-muted-foreground">Your assigned schedule will appear here.</p></div>
        )}
      </section>
    </div>
  );
}
