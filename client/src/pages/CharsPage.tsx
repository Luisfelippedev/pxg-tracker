import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useChars, useCreateChar, useDeleteChar, useUpdateChar } from "@/hooks/useTaskData";
import { useChar } from "@/contexts/CharContext";
import { toast } from "sonner";
import type { Char } from "@/types";

export default function CharsPage() {
  const { data: chars } = useChars();
  const { selectedChar, setSelectedChar } = useChar();
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [charToDelete, setCharToDelete] = useState<Char | null>(null);
  const createChar = useCreateChar();
  const updateChar = useUpdateChar();
  const deleteChar = useDeleteChar();

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createChar.mutateAsync(newName.trim());
    setNewName("");
    toast.success("Char criado");
  }

  const handleConfirmDeleteChar = async () => {
    if (!charToDelete) return;
    try {
      await deleteChar.mutateAsync(charToDelete.id);
      if (selectedChar?.id === charToDelete.id) {
        const remaining = chars?.filter((c) => c.id !== charToDelete.id) ?? [];
        setSelectedChar(remaining[0] ?? null);
      }
      setCharToDelete(null);
      toast.success("Char removido");
    } catch {
      toast.error("Não foi possível excluir o char.");
    }
  };

  return (
    <div className="space-y-6">
      <AlertDialog open={!!charToDelete} onOpenChange={(open) => !open && setCharToDelete(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Excluir personagem?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ao excluir &quot;{charToDelete?.name}&quot;, todos os dados relacionados serão removidos
              permanentemente: histórico de tarefas, progresso semanal e mensal, e configurações de
              templates. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDeleteChar();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div>
        <h1 className="text-3xl font-display font-bold">Chars</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie os personagens da sua conta</p>
      </div>

      <Card className="gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle>Novo char</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do char"
            />
            <Button type="submit" disabled={createChar.isPending}>
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {chars?.map((char) => {
          const value = editing[char.id] ?? char.name;
          return (
            <Card key={char.id} className="border-border bg-card/80">
              <CardContent className="pt-6 flex gap-2 items-center">
                <Input
                  value={value}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, [char.id]: e.target.value }))
                  }
                />
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await updateChar.mutateAsync({ id: char.id, name: value });
                    toast.success("Char atualizado");
                  }}
                >
                  Salvar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setCharToDelete(char)}
                >
                  Excluir
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
