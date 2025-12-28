"use client";

import { useState, useEffect, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Shield, Plus, Users, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Componentes UI reutilizables
import {
  PageHeader,
  SearchFilters,
  ConfirmDialog,
  Badge,
  TextInput,
  TextAreaInput,
  PageSkeleton,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Label,
  Checkbox,
  EmptyState,
} from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface Permission {
  id: string;
  action: string;
  module: string;
}

interface Role {
  id: string;
  nom: string;
  description: string | null;
  permissions: Permission[];
  _count: { employes: number };
}

const MODULES = [
  { value: "produits", label: "Produits" },
  { value: "stocks", label: "Stocks" },
  { value: "ventes", label: "Ventes" },
  { value: "clients", label: "Clients" },
  { value: "fournisseurs", label: "Fournisseurs" },
  { value: "commandes", label: "Commandes" },
  { value: "factures", label: "Factures" },
  { value: "avoirs", label: "Avoirs" },
  { value: "rapports", label: "Rapports" },
  { value: "etablissements", label: "Établissements" },
  { value: "transferts", label: "Transferts" },
];

const ACTIONS = [
  { value: "voir", label: "Voir" },
  { value: "creer", label: "Créer" },
  { value: "modifier", label: "Modifier" },
  { value: "supprimer", label: "Supprimer" },
];

const INITIAL_FORM = {
  nom: "",
  description: "",
  permissions: [] as { module: string; action: string }[],
};

export default function RolesPage() {
  // Estados de datos
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de búsqueda
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);

  // Estados de dialogs
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Estados de formularios
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/roles?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors du chargement");
      }

      const data = await res.json();
      setRoles(data.roles || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setError(message);
      toast.error(message);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Permission helpers
  const hasPermission = (module: string, action: string): boolean => {
    return formData.permissions.some((p) => p.module === module && p.action === action);
  };

  const hasAllModulePermissions = (module: string): boolean => {
    return ACTIONS.every(a => hasPermission(module, a.value));
  };

  const hasAllActionPermissions = (action: string): boolean => {
    return MODULES.every(m => hasPermission(m.value, action));
  };

  const togglePermission = (module: string, action: string) => {
    const exists = hasPermission(module, action);
    if (exists) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter((p) => !(p.module === module && p.action === action)),
      });
    } else {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, { module, action }],
      });
    }
  };

  const toggleModuleAll = (module: string) => {
    const hasAll = hasAllModulePermissions(module);
    if (hasAll) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(p => p.module !== module),
      });
    } else {
      const newPerms = formData.permissions.filter(p => p.module !== module);
      ACTIONS.forEach(a => newPerms.push({ module, action: a.value }));
      setFormData({ ...formData, permissions: newPerms });
    }
  };

  const toggleActionAll = (action: string) => {
    const hasAll = hasAllActionPermissions(action);
    if (hasAll) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(p => p.action !== action),
      });
    } else {
      const newPerms = formData.permissions.filter(p => p.action !== action);
      MODULES.forEach(m => newPerms.push({ module: m.value, action }));
      setFormData({ ...formData, permissions: newPerms });
    }
  };

  const selectAllPermissions = () => {
    const allPerms: { module: string; action: string }[] = [];
    MODULES.forEach(m => ACTIONS.forEach(a => allPerms.push({ module: m.value, action: a.value })));
    setFormData({ ...formData, permissions: allPerms });
  };

  const clearAllPermissions = () => {
    setFormData({ ...formData, permissions: [] });
  };

  // Handlers
  const resetForm = () => setFormData(INITIAL_FORM);

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      nom: role.nom,
      description: role.description || "",
      permissions: role.permissions.map(p => ({ module: p.module, action: p.action })),
    });
    setEditDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: formData.nom.trim(),
          description: formData.description.trim() || null,
          permissions: formData.permissions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur création");
      }

      toast.success("Rôle créé avec succès");
      setCreateDialogOpen(false);
      resetForm();
      fetchRoles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !formData.nom.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRole.id,
          nom: formData.nom.trim(),
          description: formData.description.trim() || null,
          permissions: formData.permissions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur modification");
      }

      toast.success("Rôle modifié avec succès");
      setEditDialogOpen(false);
      resetForm();
      fetchRoles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/roles?id=${selectedRole.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur suppression");
      }
      toast.success("Rôle supprimé");
      setDeleteDialogOpen(false);
      setSelectedRole(null);
      fetchRoles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  // Componente de tabla de permisos
  const PermissionsTable = () => (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="p-2 text-left font-medium">Module</th>
            {ACTIONS.map((action) => (
              <th key={action.value} className="p-2 text-center font-medium">
                <div className="flex flex-col items-center gap-1">
                  <span>{action.label}</span>
                  <Checkbox
                    checked={hasAllActionPermissions(action.value)}
                    onCheckedChange={() => toggleActionAll(action.value)}
                    className="opacity-70"
                  />
                </div>
              </th>
            ))}
            <th className="p-2 text-center font-medium">Tous</th>
          </tr>
        </thead>
        <tbody>
          {MODULES.map((module) => (
            <tr key={module.value} className="border-t">
              <td className="p-2 font-medium">{module.label}</td>
              {ACTIONS.map((action) => (
                <td key={action.value} className="p-2 text-center">
                  <Checkbox
                    checked={hasPermission(module.value, action.value)}
                    onCheckedChange={() => togglePermission(module.value, action.value)}
                  />
                </td>
              ))}
              <td className="p-2 text-center">
                <Checkbox
                  checked={hasAllModulePermissions(module.value)}
                  onCheckedChange={() => toggleModuleAll(module.value)}
                  className="opacity-70"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Skeleton de carga inicial
  if (loading && roles.length === 0) {
    return <PageSkeleton hasFilters={true} filtersCount={0} columnsCount={5} showStats statsCount={2} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Rôles & Permissions"
        description="Configurez les accès de votre équipe"
        icon={Shield}
        actions={[
          {
            label: "Nouveau rôle",
            onClick: openCreateDialog,
            icon: Plus,
          },
        ]}
      />

      {/* Estadísticas */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{roles.length}</p>
            <p className="text-sm text-muted-foreground">Rôles créés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{roles.reduce((sum, r) => sum + r._count.employes, 0)}</p>
            <p className="text-sm text-muted-foreground">Employés assignés</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro de búsqueda */}
      <SearchFilters
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Rechercher un rôle...",
        }}
        filters={[]}
        onReset={() => setSearch("")}
      />

      {/* Lista de roles */}
      {roles.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Shield}
              title="Aucun rôle"
              message="Créez des rôles pour gérer les permissions de vos employés"
              action={{ label: "Créer un rôle", onClick: openCreateDialog, icon: Plus }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Rôles ({roles.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Nom</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">Description</th>
                    <th className="p-4 text-center text-sm font-medium text-muted-foreground">Employés</th>
                    <th className="p-4 text-center text-sm font-medium text-muted-foreground hidden sm:table-cell">Permissions</th>
                    <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Shield className="h-5 w-5 text-primary" />
                          </div>
                          <span className="font-medium">{role.nom}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground hidden md:table-cell">{role.description || "-"}</td>
                      <td className="p-4 text-center">
                        <Badge variant="info">{role._count.employes}</Badge>
                      </td>
                      <td className="p-4 text-center hidden sm:table-cell">
                        <Badge variant="neutral">{role.permissions.length}</Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(role)}>
                            <Pencil className="h-4 w-4 mr-1" />
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRole(role);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={role._count.employes > 0}
                            title={role._count.employes > 0 ? "Réassignez d'abord les employés" : "Supprimer"}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Création */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nouveau rôle</DialogTitle>
            <DialogDescription>Créez un nouveau rôle avec ses permissions.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <DialogBody>
              <div className="space-y-4">
                <TextInput
                  id="nom"
                  label="Nom du rôle"
                  value={formData.nom}
                  onChange={(v) => setFormData({ ...formData, nom: v })}
                  placeholder="Ex: Vendeur"
                  required
                />
                <TextAreaInput
                  id="description"
                  label="Description"
                  value={formData.description}
                  onChange={(v) => setFormData({ ...formData, description: v })}
                  placeholder="Description du rôle..."
                  rows={2}
                />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Permissions</Label>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={selectAllPermissions}>
                        Tout sélectionner
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={clearAllPermissions}>
                        Tout désélectionner
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Note : La gestion des employés et des rôles est réservée au propriétaire uniquement.
                  </p>
                  <PermissionsTable />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Modificación */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier le rôle</DialogTitle>
            <DialogDescription>Modifiez les informations et permissions du rôle.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <DialogBody>
              <div className="space-y-4">
                <TextInput
                  id="edit-nom"
                  label="Nom du rôle"
                  value={formData.nom}
                  onChange={(v) => setFormData({ ...formData, nom: v })}
                  placeholder="Ex: Vendeur"
                  required
                />
                <TextAreaInput
                  id="edit-description"
                  label="Description"
                  value={formData.description}
                  onChange={(v) => setFormData({ ...formData, description: v })}
                  placeholder="Description du rôle..."
                  rows={2}
                />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Permissions</Label>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={selectAllPermissions}>
                        Tout sélectionner
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={clearAllPermissions}>
                        Tout désélectionner
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Note : La gestion des employés et des rôles est réservée au propriétaire uniquement.
                  </p>
                  <PermissionsTable />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Suppression */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer le rôle"
        description={
          <>
            Êtes-vous sûr de vouloir supprimer le rôle &quot;<strong>{selectedRole?.nom}</strong>&quot; ?
            Cette action est irréversible.
          </>
        }
        confirmLabel="Supprimer"
        loadingLabel="Suppression..."
        onConfirm={handleDelete}
        loading={submitting}
      />
    </div>
  );
}
