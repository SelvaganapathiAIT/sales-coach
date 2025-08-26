import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, UploadCloud } from "lucide-react";

interface TrainingFile {
  name: string;
  path: string;
  created_at?: string;
  last_modified?: string;
  publicUrl?: string;
}

interface TrainingDataManagerProps {
  onListChange?: (files: TrainingFile[]) => void;
}

export const TrainingDataManager: React.FC<TrainingDataManagerProps> = ({ onListChange }) => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [files, setFiles] = useState<TrainingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id || null;
      setUserId(uid);
      if (uid) await refresh(uid);
      setLoading(false);
    })();
  }, []);

  const refresh = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("coach-training")
        .list(uid, { limit: 100, sortBy: { column: "name", order: "desc" } as any });
      if (error) throw error;
      const mapped: TrainingFile[] = (data || []).map((f) => ({
        name: f.name,
        path: `${uid}/${f.name}`,
        created_at: (f as any).created_at,
        last_modified: (f as any).updated_at,
      }));
      setFiles(mapped);
      onListChange?.(mapped);
    } catch (e: any) {
      console.error("List training files failed", e);
      toast({ title: "Could not load files", description: e.message, variant: "destructive" });
    }
  }, [onListChange, toast]);

  const handleUpload = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId) return;
    const input = evt.target;
    const selected = input.files;
    if (!selected || selected.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(selected)) {
        const filePath = `${userId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from("coach-training")
          .upload(filePath, file, { upsert: false });
        if (error) throw error;
      }
      toast({ title: "Uploaded", description: "Your training files were uploaded." });
      await refresh(userId);
    } catch (e: any) {
      console.error("Upload failed", e);
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (evt.target) evt.target.value = "";
    }
  };

  const handleDelete = async (path: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase.storage.from("coach-training").remove([path]);
      if (error) throw error;
      toast({ title: "Deleted", description: "File removed from training set." });
      await refresh(userId);
    } catch (e: any) {
      console.error("Delete failed", e);
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const fileItems = useMemo(() => files, [files]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center">
            <Input
              type="file"
              multiple
              onChange={handleUpload}
              className="hidden"
              id="training-file-input"
              accept=".csv,.xlsx,.xls,.pdf,.mp3,.wav,.m4a,.txt,.json,.zip,.tar,.gz,video/*,audio/*,image/*,.doc,.docx,.ppt,.pptx"
            />
            <Button asChild disabled={uploading || !userId}>
              <span>
                <label htmlFor="training-file-input" className="flex items-center gap-2 cursor-pointer">
                  <UploadCloud className="h-4 w-4" />
                  Upload files
                </label>
              </span>
            </Button>
          </label>
        </div>

        <Separator className="my-4" />

        <div className="text-sm text-muted-foreground mb-2">History</div>
        <ScrollArea className="h-56 rounded-md border">
          <div className="p-3 space-y-2">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading files…</div>
            ) : fileItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">No training files yet.</div>
            ) : (
              fileItems.map((f) => (
                <div key={f.path} className="flex items-center justify-between gap-3 rounded-md border p-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{f.created_at ? new Date(f.created_at).toLocaleString() : ""}</div>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => handleDelete(f.path)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
