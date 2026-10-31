import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { friendlyError } from "@/lib/errors";

/** Exclui definitivamente um equipamento sem histórico (OS/checklists bloqueiam no servidor). */
export function DeleteEquipmentButton({ id, serial, goBack, size = "sm" }: { id: string; serial: string; goBack?: boolean; size?: "sm" | "default" }) {
  const qc = useQueryClient(); const navigate = useNavigate();
  const m = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc("delete_equipment", { p_id: id }); if (error) throw error; },
    onSuccess: () => { toast.success("Equipamento excluído"); qc.invalidateQueries({ queryKey: ["equipment"] }); if (goBack) navigate({ to: "/equipamentos" }); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  return (
    <Button size={size} variant="ghost" className={`text-destructive hover:text-destructive ${size === "default" ? "min-h-11" : ""}`} disabled={m.isPending}
      onClick={() => { if (window.confirm(`Excluir o equipamento ${serial} definitivamente? Esta ação não pode ser desfeita.`)) m.mutate(); }}>
      <Trash2 className="mr-1 h-4 w-4" />Excluir
    </Button>
  );
}
