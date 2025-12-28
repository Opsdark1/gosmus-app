"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Truck, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/constants";

// Componentes UI reutilizables
import {
  PageHeader,
  SearchFilters,
  DataTable,
  CrudActions,
  FormDialog,
  DetailsDialog,
  ConfirmDialog,
  Badge,
  FormGrid,
  TextInput,
  TextAreaInput,
  PageSkeleton,
  TooltipProvider,
  type ColumnDef,
  type FilterConfig,
} from "@/components/ui";
import { useSorting, type SortDirection } from "@/components/ui/sortable-header";

const PAGE_SIZE = 10;

interface Fournisseur {
  id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  ville: string | null;
  ice: string | null;
  actif: boolean;
  createdAt: string;
  _count?: { stocks: number; commandes: number };
}

const INITIAL_FORM = {
  nom: "",
  telephone: "",
  email: "",
  adresse: "",
  ville: "",
  ice: "",
};

export default function FournisseursPage() {
  // États de données
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États de recherche et filtres
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterStatus, setFilterStatus] = useState("all");

  // États de pagination et tri
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>("nom");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // États des dialogs
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // États de formulaires
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [editFormData, setEditFormData] = useState({ id: "", ...INITIAL_FORM });

  // États de chargement des actions
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset page on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Fetch fournisseurs
  const fetchFournisseurs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set("search", debouncedSearch);

      const response = await fetch(`/api/fournisseurs?${params.toString()}`);
      if (!response.ok) throw new Error("Erreur lors de la récupération des fournisseurs");

      const data = await response.json();
      setFournisseurs(data.fournisseurs || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchFournisseurs();
  }, [fetchFournisseurs]);

  // Filtrage et tri
  const filteredFournisseurs = useMemo(() => {
    return fournisseurs.filter(f => {
      if (filterStatus === "actif" && !f.actif) return false;
      if (filterStatus === "inactif" && f.actif) return false;
      return true;
    });
  }, [fournisseurs, filterStatus]);

  const sortedFournisseurs = useSorting(filteredFournisseurs, sortKey, sortDirection);

  const paginatedFournisseurs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedFournisseurs.slice(start, start + PAGE_SIZE);
  }, [sortedFournisseurs, currentPage]);

  // Handlers
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleViewDetails = (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setDetailsOpen(true);
  };

  const handleOpenEdit = (fournisseur: Fournisseur) => {
    setEditFormData({
      id: fournisseur.id,
      nom: fournisseur.nom,
      telephone: fournisseur.telephone || "",
      email: fournisseur.email || "",
      adresse: fournisseur.adresse || "",
      ville: fournisseur.ville || "",
      ice: fournisseur.ice || "",
    });
    setEditDialogOpen(true);
  };

  const handleOpenDelete = (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedFournisseur) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/fournisseurs?id=${selectedFournisseur.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la suppression");
      }
      toast.success("Fournisseur supprimé avec succès");
      setDeleteDialogOpen(false);
      setDetailsOpen(false);
      setSelectedFournisseur(null);
      fetchFournisseurs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/fournisseurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: formData.nom,
          telephone: formData.telephone || null,
          email: formData.email || null,
          adresse: formData.adresse || null,
          ville: formData.ville || null,
          ice: formData.ice || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la création");
      }

      toast.success("Fournisseur créé avec succès");
      setCreateDialogOpen(false);
      setFormData(INITIAL_FORM);
      fetchFournisseurs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.nom.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }

    setEditing(true);
    try {
      const response = await fetch("/api/fournisseurs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editFormData.id,
          nom: editFormData.nom,
          telephone: editFormData.telephone || null,
          email: editFormData.email || null,
          adresse: editFormData.adresse || null,
          ville: editFormData.ville || null,
          ice: editFormData.ice || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la modification");
      }

      toast.success("Fournisseur modifié avec succès");
      setEditDialogOpen(false);
      fetchFournisseurs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setEditing(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setFilterStatus("all");
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
  ];

  // Définition des colonnes
  const columns: ColumnDef<Fournisseur>[] = [
    {
      key: "nom",
      header: "Nom",
      sortable: true,
      render: (f) => <span className="font-medium">{f.nom}</span>,
    },
    {
      key: "telephone",
      header: "Téléphone",
      sortable: true,
      hidden: "md",
      render: (f) => <span className="text-muted-foreground">{f.telephone || "-"}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      hidden: "lg",
      render: (f) => <span className="text-muted-foreground">{f.email || "-"}</span>,
    },
    {
      key: "ville",
      header: "Ville",
      sortable: true,
      hidden: "xl",
      render: (f) => <span className="text-muted-foreground">{f.ville || "-"}</span>,
    },
    {
      key: "actif",
      header: "Statut",
      align: "center",
      hidden: "sm",
      render: (f) => (
        <Badge variant={f.actif ? "success" : "warning"}>
          {f.actif ? "Actif" : "Inactif"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (f) => (
        <CrudActions
          item={f}
          onView={handleViewDetails}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
        />
      ),
    },
  ];

  // Skeleton de chargement initial
  if (loading && fournisseurs.length === 0) {
    return <PageSkeleton filtersCount={1} columnsCount={6} />;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Fournisseurs"
          description="Gérez vos partenaires fournisseurs"
          icon={Truck}
          actions={[
            {
              label: "Nouveau fournisseur",
              onClick: () => setCreateDialogOpen(true),
              icon: Plus,
            },
          ]}
        />

        {/* Filtres */}
        <SearchFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Rechercher par nom, téléphone ou email...",
          }}
          filters={filters}
          onReset={resetFilters}
        />

        {/* Table */}
        <DataTable
          data={paginatedFournisseurs}
          columns={columns}
          loading={loading}
          error={error}
          getRowKey={(f) => f.id}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
          totalItems={sortedFournisseurs.length}
          onPageChange={setCurrentPage}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          emptyIcon={Truck}
          emptyTitle="Aucun fournisseur"
          emptyMessage={debouncedSearch.trim() 
            ? "Aucun fournisseur ne correspond à votre recherche" 
            : "Commencez par créer votre premier fournisseur"
          }
          emptyAction={!debouncedSearch.trim() ? {
            label: "Nouveau fournisseur",
            onClick: () => setCreateDialogOpen(true),
            icon: Plus,
          } : undefined}
        />

        {/* Dialog Détails */}
        <DetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          title="Détails du fournisseur"
          sections={selectedFournisseur ? [
            {
              items: [
                { label: "Nom", value: selectedFournisseur.nom },
                { label: "ICE", value: selectedFournisseur.ice },
                { label: "Téléphone", value: selectedFournisseur.telephone },
                { label: "Email", value: selectedFournisseur.email },
                { label: "Adresse", value: selectedFournisseur.adresse },
                { label: "Ville", value: selectedFournisseur.ville },
              ],
            },
            {
              title: "Informations",
              items: [
                { 
                  label: "Statut", 
                  value: (
                    <Badge variant={selectedFournisseur.actif ? "success" : "warning"}>
                      {selectedFournisseur.actif ? "Actif" : "Inactif"}
                    </Badge>
                  )
                },
                { label: "Date de création", value: formatDate(selectedFournisseur.createdAt) },
              ],
            },
          ] : []}
        />

        {/* Dialog Suppression */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Confirmer la suppression"
          description={
            <>
              Êtes-vous sûr de vouloir supprimer le fournisseur{" "}
              <strong>{selectedFournisseur?.nom}</strong> ?
              Cette action est irréversible.
            </>
          }
          confirmLabel="Supprimer"
          loadingLabel="Suppression..."
          onConfirm={handleDelete}
          loading={deleting}
        />

        {/* Dialog Création */}
        <FormDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          title="Nouveau fournisseur"
          onSubmit={handleCreate}
          loading={creating}
          submitLabel="Créer le fournisseur"
          loadingLabel="Création..."
        >
          <FormGrid>
            <TextInput
              id="nom"
              label="Nom"
              value={formData.nom}
              onChange={(v) => setFormData({ ...formData, nom: v })}
              placeholder="Nom du fournisseur"
              required
            />
            <TextInput
              id="ice"
              label="ICE"
              value={formData.ice}
              onChange={(v) => setFormData({ ...formData, ice: v })}
              placeholder="Identifiant Commun de l'Entreprise"
            />
            <TextInput
              id="telephone"
              label="Téléphone"
              value={formData.telephone}
              onChange={(v) => setFormData({ ...formData, telephone: v })}
              placeholder="0XXXXXXXXX"
            />
            <TextInput
              id="email"
              label="Email"
              type="email"
              value={formData.email}
              onChange={(v) => setFormData({ ...formData, email: v })}
              placeholder="email@exemple.com"
            />
            <TextInput
              id="ville"
              label="Ville"
              value={formData.ville}
              onChange={(v) => setFormData({ ...formData, ville: v })}
              placeholder="Ville"
            />
          </FormGrid>
          <TextAreaInput
            id="adresse"
            label="Adresse"
            value={formData.adresse}
            onChange={(v) => setFormData({ ...formData, adresse: v })}
            placeholder="Adresse complète"
            rows={2}
          />
        </FormDialog>

        {/* Dialog Modification */}
        <FormDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          title="Modifier le fournisseur"
          onSubmit={handleEdit}
          loading={editing}
          submitLabel="Enregistrer"
          loadingLabel="Modification..."
        >
          <FormGrid>
            <TextInput
              id="edit-nom"
              label="Nom"
              value={editFormData.nom}
              onChange={(v) => setEditFormData({ ...editFormData, nom: v })}
              placeholder="Nom du fournisseur"
              required
            />
            <TextInput
              id="edit-ice"
              label="ICE"
              value={editFormData.ice}
              onChange={(v) => setEditFormData({ ...editFormData, ice: v })}
              placeholder="Identifiant Commun de l'Entreprise"
            />
            <TextInput
              id="edit-telephone"
              label="Téléphone"
              value={editFormData.telephone}
              onChange={(v) => setEditFormData({ ...editFormData, telephone: v })}
              placeholder="0XXXXXXXXX"
            />
            <TextInput
              id="edit-email"
              label="Email"
              type="email"
              value={editFormData.email}
              onChange={(v) => setEditFormData({ ...editFormData, email: v })}
              placeholder="email@exemple.com"
            />
            <TextInput
              id="edit-ville"
              label="Ville"
              value={editFormData.ville}
              onChange={(v) => setEditFormData({ ...editFormData, ville: v })}
              placeholder="Ville"
            />
          </FormGrid>
          <TextAreaInput
            id="edit-adresse"
            label="Adresse"
            value={editFormData.adresse}
            onChange={(v) => setEditFormData({ ...editFormData, adresse: v })}
            placeholder="Adresse complète"
            rows={2}
          />
        </FormDialog>
      </div>
    </TooltipProvider>
  );
}
