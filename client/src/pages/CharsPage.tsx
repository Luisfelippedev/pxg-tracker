import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useChars, useCreateChar, useDeleteChar, useUpdateChar } from "@/hooks/useTaskData";
import { toast } from "sonner";

export default function CharsPage() {
  const { data: chars } = useChars();
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});
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

  return (
    <div className="space-y-6">
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
                  onClick={async () => {
                    await deleteChar.mutateAsync(char.id);
                    toast.success("Char removido");
                  }}
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
