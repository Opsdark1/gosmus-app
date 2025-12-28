"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { sortItems } from "@/lib/utils";
import { Users, UserPlus, UserX, Plus, Mail, Pencil, Loader2, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/constants";

// Componentes UI reutilizables
import {
  PageHeader,
  SearchFilters,
  DataTable,
  TableActions,
  FormDialog,
  DetailsDialog,
  ConfirmDialog,
  Badge,
  FormGrid,
  TextInput,
  SelectInput,
  PageSkeleton,
  TooltipProvider,
  Card,
  CardContent,
  Button,
  Input,
  Label,
  type ColumnDef,
  type FilterConfig,
} from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type SortDirection } from "@/components/ui/sortable-header";

const PAGE_SIZE = 10;

interface Role {
  id: string;
  nom: string;
}

interface Employe {
  id: string;
  nom: string;
  email: string | null;
  role: Role | null;
  actif: boolean;
  createdAt: string;
}

const INITIAL_FORM = {
  nom: "",
  email: "",
  password: "",
  roleId: "",
};

export default function EmployesPage() {
  // Estados de datos
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de búsqueda y filtros
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  // Estados de paginación y orden
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>("nom");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Estados de dialogs
  const [selectedEmploye, setSelectedEmploye] = useState<Employe | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Estados de formularios
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [editFormData, setEditFormData] = useState({ nom: "", roleId: "" });

  // Estados de loading de acciones
  const [submitting, setSubmitting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // Reset page on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Fetch empleados
  const fetchEmployes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/employes?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors du chargement");
      }

      const data = await res.json();
      setEmployes(data.employes || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setError(message);
      toast.error(message);
      setEmployes([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch {
      console.error("Erreur chargement rôles");
    }
  };

  useEffect(() => {
    fetchEmployes();
  }, [fetchEmployes]);

  useEffect(() => {
    fetchRoles();
  }, []);

  // Filtrage et tri
  const filteredEmployes = useMemo(() => {
    return employes.filter(e => {
      if (filterStatus === "actif" && !e.actif) return false;
      if (filterStatus === "inactif" && e.actif) return false;
      if (filterRole !== "all" && e.role?.id !== filterRole) return false;
      return true;
    });
  }, [employes, filterStatus, filterRole]);

  const sortedEmployes = useMemo(() => {
    return sortItems({
      items: filteredEmployes,
      sortKey,
      sortDirection,
      getValue: (item, key) => {
        switch (key) {
          case "nom": return item.nom;
          case "email": return item.email || "";
          case "role": return item.role?.nom || "";
          case "actif": return Number(item.actif);
          default: return null;
        }
      }
    });
  }, [filteredEmployes, sortKey, sortDirection]);

  const paginatedEmployes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedEmployes.slice(start, start + PAGE_SIZE);
  }, [sortedEmployes, currentPage]);

  // Estadísticas
  const activeCount = employes.filter((e) => e.actif).length;
  const inactiveCount = employes.filter((e) => !e.actif).length;

  // Handlers
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => prev === "asc" ? "desc" : prev === "desc" ? null : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const resetForm = () => setFormData(INITIAL_FORM);

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleViewDetails = (employe: Employe) => {
    setSelectedEmploye(employe);
    setDetailsOpen(true);
  };

  const handleOpenEdit = (employe: Employe) => {
    setSelectedEmploye(employe);
    setEditFormData({
      nom: employe.nom,
      roleId: employe.role?.id || "",
    });
    setEditDialogOpen(true);
  };

  const handleOpenDelete = (employe: Employe) => {
    setSelectedEmploye(employe);
    setDeleteDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.error("Nom, email et mot de passe sont requis");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (!formData.roleId) {
      toast.error("Le rôle est obligatoire");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/employes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: formData.nom.trim(),
          email: formData.email.trim(),
          password: formData.password,
          roleId: formData.roleId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création");

      toast.success("Employé créé avec succès");
      setCreateDialogOpen(false);
      resetForm();
      fetchEmployes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmploye || !editFormData.nom.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/employes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedEmploye.id,
          nom: editFormData.nom.trim(),
          roleId: editFormData.roleId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      toast.success("Employé modifié avec succès");
      setEditDialogOpen(false);
      fetchEmployes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (employe?: Employe) => {
    const target = employe || selectedEmploye;
    if (!target?.email) {
      toast.error("Cet employé n'a pas d'email");
      return;
    }

    setSendingReset(true);
    try {
      const res = await fetch("/api/employes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id, action: "reset_password" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      toast.success("Email de réinitialisation envoyé à " + target.email);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSendingReset(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedEmploye) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/employes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedEmploye.id, actif: false }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      toast.success("Employé désactivé");
      setDetailsOpen(false);
      fetchEmployes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmploye) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/employes?id=${selectedEmploye.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      toast.success("Employé supprimé");
      setDeleteDialogOpen(false);
      setDetailsOpen(false);
      setSelectedEmploye(null);
      fetchEmployes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterRole("all");
    setCurrentPage(1);
  };

  // Configuration des filtres
  const filters: FilterConfig[] = [
    {
      key: "status",
      placeholder: "Statut",
      value: filterStatus,
      onChange: (v) => { setFilterStatus(v); setCurrentPage(1); },
      options: [
        { value: "all", label: "Tous" },
        { value: "actif", label: "Actifs" },
        { value: "inactif", label: "Inactifs" },
      ],
    },
    {
      key: "role",
      placeholder: "Rôle",
      value: filterRole,
      onChange: (v) => { setFilterRole(v); setCurrentPage(1); },
      width: "sm:w-[180px]",
      options: [
        { value: "all", label: "Tous les rôles" },
        ...roles.map((r) => ({ value: r.id, label: r.nom })),
      ],
    },
  ];

  // Définition des colonnes
  const columns: ColumnDef<Employe>[] = [
    {
      key: "nom",
      header: "Nom",
      sortable: true,
      render: (e) => <span className="font-medium">{e.nom}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      hidden: "md",
      render: (e) => <span className="text-muted-foreground">{e.email || "-"}</span>,
    },
    {
      key: "role",
      header: "Rôle",
      sortable: true,
      hidden: "lg",
      render: (e) => e.role ? <Badge variant="info">{e.role.nom}</Badge> : <span className="text-muted-foreground">-</span>,
    },
    {
      key: "actif",
      header: "Statut",
      sortable: true,
      hidden: "sm",
      render: (e) => <Badge variant={e.actif ? "success" : "warning"}>{e.actif ? "Actif" : "Inactif"}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (employe) => (
        <TableActions
          actions={[
            { icon: "eye", tooltip: "Voir détails", onClick: () => handleViewDetails(employe) },
            { icon: "pencil", tooltip: "Modifier", onClick: () => handleOpenEdit(employe) },
            { 
              icon: "custom", 
              customIcon: <Mail className="h-4 w-4" />,
              tooltip: "Réinitialiser mot de passe", 
              onClick: () => handleResetPassword(employe),
              disabled: sendingReset || !employe.email,
            },
            { icon: "trash", tooltip: "Supprimer", onClick: () => handleOpenDelete(employe), variant: "destructive" },
          ]}
        />
      ),
    },
  ];

  // Skeleton de chargement initial
  if (loading && employes.length === 0) {
    return <PageSkeleton filtersCount={2} columnsCount={5} showStats statsCount={3} />;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Gestion des employés"
          description="Gérez les comptes de vos employés liés à votre pharmacie"
          icon={Users}
          actions={[
            {
              label: "Nouvel employé",
              onClick: openCreateDialog,
              icon: UserPlus,
            },
          ]}
        />

        {/* Statistiques */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-3 text-2xl font-semibold">{employes.length}</p>
              <p className="text-sm text-muted-foreground">Total employés</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="mt-3 text-2xl font-semibold">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Actifs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                <UserX className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="mt-3 text-2xl font-semibold">{inactiveCount}</p>
              <p className="text-sm text-muted-foreground">Inactifs</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <SearchFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Rechercher un employé par nom ou email...",
          }}
          filters={filters}
          onReset={resetFilters}
        />

        {/* Table */}
        <DataTable
          data={paginatedEmployes}
          columns={columns}
          loading={loading}
          error={error}
          getRowKey={(e) => e.id}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
          totalItems={sortedEmployes.length}
          onPageChange={setCurrentPage}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          emptyIcon={Users}
          emptyTitle="Aucun employé"
          emptyMessage="Ajoutez des employés pour leur donner accès à votre système"
          emptyAction={{
            label: "Ajouter un employé",
            onClick: openCreateDialog,
            icon: UserPlus,
          }}
        />

        {/* Dialog Détails */}
        <DetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          title="Détails de l'employé"
          sections={selectedEmploye ? [
            {
              items: [
                { label: "Nom", value: selectedEmploye.nom },
                { label: "Email", value: selectedEmploye.email },
              ],
            },
            {
              items: [
                { label: "Rôle", value: selectedEmploye.role ? <Badge variant="info">{selectedEmploye.role.nom}</Badge> : "Aucun" },
                { label: "Statut", value: <Badge variant={selectedEmploye.actif ? "success" : "warning"}>{selectedEmploye.actif ? "Actif" : "Inactif"}</Badge> },
              ],
            },
            {
              items: [
                { label: "Date de création", value: formatDate(selectedEmploye.createdAt) },
              ],
            },
          ] : []}
          footer={selectedEmploye && (
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => { setDetailsOpen(false); handleOpenEdit(selectedEmploye); }}>
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleResetPassword()} disabled={sendingReset || !selectedEmploye.email}>
                {sendingReset ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
                Réinitialiser mot de passe
              </Button>
              {selectedEmploye.actif && (
                <Button variant="outline" size="sm" onClick={handleDeactivate} disabled={submitting}>
                  <UserX className="h-4 w-4 mr-2" />
                  Désactiver
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)} disabled={submitting}>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </div>
          )}
        />

        {/* Dialog Suppression */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Supprimer l'employé"
          description={
            <>
              Êtes-vous sûr de vouloir supprimer <strong>{selectedEmploye?.nom}</strong> ? 
              Son compte Firebase sera également supprimé et il ne pourra plus se connecter.
            </>
          }
          confirmLabel="Supprimer"
          loadingLabel="Suppression..."
          onConfirm={handleDelete}
          loading={submitting}
        />

        {/* Dialog Création */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nouvel employé</DialogTitle>
              <DialogDescription>
                Créez un compte pour un nouvel employé. Il pourra se connecter avec l&apos;email et le mot de passe que vous définissez.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <DialogBody>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom complet *</Label>
                    <Input placeholder="Nom Prénom" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" placeholder="email@exemple.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Mot de passe *</Label>
                    <Input type="password" placeholder="Minimum 6 caractères" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <Label>Rôle *</Label>
                    <Select value={formData.roleId} onValueChange={(v) => setFormData({ ...formData, roleId: v })} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {roles.length === 0 && (
                      <p className="text-xs text-amber-600">Aucun rôle disponible. Créez d&apos;abord un rôle.</p>
                    )}
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Important :</strong> L&apos;employé ne pourra se connecter que si votre compte est actif.
                    </p>
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Créer l&apos;employé
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Modification */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Modifier l&apos;employé</DialogTitle>
              <DialogDescription>Modifiez les informations de {selectedEmploye?.nom}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEdit}>
              <DialogBody>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom complet *</Label>
                    <Input placeholder="Nom Prénom" value={editFormData.nom} onChange={(e) => setEditFormData({ ...editFormData, nom: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={selectedEmploye?.email || ""} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">L&apos;email ne peut pas être modifié</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Rôle *</Label>
                    <Select value={editFormData.roleId} onValueChange={(v) => setEditFormData({ ...editFormData, roleId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
