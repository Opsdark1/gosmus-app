"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { User, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/constants";

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

interface Client {
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  ville: string | null;
  cin: string | null;
  solde: number;
  credit: number;
  actif: boolean;
  createdAt: string;
  _count?: { ventes: number; avoirs: number };
}

const INITIAL_FORM = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  adresse: "",
  ville: "",
  cin: "",
  solde: "0",
  credit: "0",
};

export default function ClientsPage() {
  // États de données
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États de recherche et filtres
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSolde, setFilterSolde] = useState("all");

  // États de pagination et tri
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>("nom");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // États des dialogs
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  // États de formulaires
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [editFormData, setEditFormData] = useState({ id: "", ...INITIAL_FORM });
  const [existingClientInfo, setExistingClientInfo] = useState<{ nom: string; prenom: string | null; telephone: string | null } | null>(null);

  // États de chargement des actions
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset page on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set("search", debouncedSearch);

      const response = await fetch(`/api/clients?${params.toString()}`);
      if (!response.ok) throw new Error("Erreur lors de la récupération des clients");

      const data = await response.json();
      setClients(data.clients || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Filtrage et tri
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      if (filterStatus === "actif" && !c.actif) return false;
      if (filterStatus === "inactif" && c.actif) return false;
      if (filterSolde === "avec" && c.solde <= 0) return false;
      if (filterSolde === "sans" && c.solde > 0) return false;
      return true;
    });
  }, [clients, filterStatus, filterSolde]);

  const sortedClients = useSorting(filteredClients, sortKey, sortDirection);

  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedClients.slice(start, start + PAGE_SIZE);
  }, [sortedClients, currentPage]);

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

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setDetailsOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditFormData({
      id: client.id,
      nom: client.nom,
      prenom: client.prenom || "",
      email: client.email || "",
      telephone: client.telephone || "",
      adresse: client.adresse || "",
      ville: client.ville || "",
      cin: client.cin || "",
      solde: String(client.solde),
      credit: String(client.credit),
    });
    setEditDialogOpen(true);
  };

  const handleOpenDelete = (client: Client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/clients?id=${selectedClient.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la suppression");
      }
      toast.success("Client supprimé avec succès");
      setDeleteDialogOpen(false);
      setDetailsOpen(false);
      setSelectedClient(null);
      fetchClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  const createClient = async (forceCreate: boolean) => {
    setCreating(true);
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          solde: parseFloat(formData.solde) || 0,
          credit: parseFloat(formData.credit) || 0,
          forceCreate,
        }),
      });

      const data = await response.json();

      if (response.status === 409 && data.requireConfirmation) {
        setExistingClientInfo(data.existingClient);
        setDuplicateDialogOpen(true);
        return;
      }

      if (!response.ok) throw new Error(data.error || "Erreur lors de la création");

      toast.success("Client créé avec succès");
      setCreateDialogOpen(false);
      setDuplicateDialogOpen(false);
      setExistingClientInfo(null);
      setFormData(INITIAL_FORM);
      fetchClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }
    await createClient(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.nom.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }

    setEditing(true);
    try {
      const response = await fetch("/api/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editFormData,
          solde: parseFloat(editFormData.solde) || 0,
          credit: parseFloat(editFormData.credit) || 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la modification");
      }

      toast.success("Client modifié avec succès");
      setEditDialogOpen(false);
      fetchClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setEditing(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterSolde("all");
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
      key: "solde",
      placeholder: "Solde",
      value: filterSolde,
      onChange: (v) => { setFilterSolde(v); setCurrentPage(1); },
      width: "sm:w-[170px]",
      options: [
        { value: "all", label: "Tous les soldes" },
        { value: "avec", label: "Avec dette" },
        { value: "sans", label: "Sans dette" },
      ],
    },
  ];

  // Définition des colonnes
  const columns: ColumnDef<Client>[] = [
    {
      key: "nom",
      header: "Nom & Prénom",
      sortable: true,
      render: (client) => (
        <span className="font-medium">
          {client.nom} {client.prenom || ""}
        </span>
      ),
    },
    {
      key: "telephone",
      header: "Téléphone",
      sortable: true,
      hidden: "md",
      render: (client) => (
        <span className="text-muted-foreground">{client.telephone || "-"}</span>
      ),
    },
    {
      key: "solde",
      header: "Solde dû",
      sortable: true,
      align: "right",
      render: (client) => (
        <span className={Number(client.solde) > 0 ? "text-red-600 font-medium" : "font-medium"}>
          {formatCurrency(Number(client.solde))}
        </span>
      ),
    },
    {
      key: "credit",
      header: "Crédit",
      sortable: true,
      align: "right",
      hidden: "lg",
      render: (client) => (
        <span className={Number(client.credit) > 0 ? "text-green-600 font-medium" : "font-medium"}>
          {formatCurrency(Number(client.credit))}
        </span>
      ),
    },
    {
      key: "actif",
      header: "Statut",
      align: "center",
      hidden: "sm",
      render: (client) => (
        <Badge variant={client.actif ? "success" : "warning"}>
          {client.actif ? "Actif" : "Inactif"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (client) => (
        <CrudActions
          item={client}
          onView={handleViewDetails}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
        />
      ),
    },
  ];

  // Skeleton de chargement initial
  if (loading && clients.length === 0) {
    return <PageSkeleton filtersCount={2} columnsCount={6} />;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Clients"
          description="Gérez vos clients et leurs crédits"
          icon={User}
          actions={[
            {
              label: "Nouveau client",
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
          data={paginatedClients}
          columns={columns}
          loading={loading}
          error={error}
          getRowKey={(client) => client.id}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
          totalItems={sortedClients.length}
          onPageChange={setCurrentPage}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          emptyIcon={User}
          emptyTitle="Aucun client"
          emptyMessage={debouncedSearch.trim() 
            ? "Aucun client ne correspond à votre recherche" 
            : "Commencez par créer votre premier client"
          }
          emptyAction={!debouncedSearch.trim() ? {
            label: "Nouveau client",
            onClick: () => setCreateDialogOpen(true),
            icon: Plus,
          } : undefined}
        />

        {/* Dialog Détails */}
        <DetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          title="Détails du client"
          sections={selectedClient ? [
            {
              items: [
                { label: "Nom", value: selectedClient.nom },
                { label: "Prénom", value: selectedClient.prenom },
                { label: "Téléphone", value: selectedClient.telephone },
                { label: "Email", value: selectedClient.email },
                { label: "Adresse", value: selectedClient.adresse },
                { label: "Ville", value: selectedClient.ville },
                { label: "CIN", value: selectedClient.cin },
                { label: "Date de création", value: formatDate(selectedClient.createdAt) },
              ],
            },
            {
              title: "Finances",
              items: [
                { 
                  label: "Solde dû", 
                  value: (
                    <span className={Number(selectedClient.solde) > 0 ? "text-red-600" : ""}>
                      {formatCurrency(Number(selectedClient.solde))}
                    </span>
                  )
                },
                { 
                  label: "Crédit disponible", 
                  value: (
                    <span className="text-green-600">
                      {formatCurrency(Number(selectedClient.credit))}
                    </span>
                  )
                },
                { 
                  label: "Statut", 
                  value: (
                    <Badge variant={selectedClient.actif ? "success" : "warning"}>
                      {selectedClient.actif ? "Actif" : "Inactif"}
                    </Badge>
                  )
                },
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
              Êtes-vous sûr de vouloir supprimer le client{" "}
              <strong>{selectedClient?.nom} {selectedClient?.prenom || ""}</strong> ?
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
          title="Nouveau client"
          onSubmit={handleCreate}
          loading={creating}
          submitLabel="Créer le client"
          loadingLabel="Création..."
        >
          <FormGrid>
            <TextInput
              id="nom"
              label="Nom"
              value={formData.nom}
              onChange={(v) => setFormData({ ...formData, nom: v })}
              placeholder="Nom du client"
              required
            />
            <TextInput
              id="prenom"
              label="Prénom"
              value={formData.prenom}
              onChange={(v) => setFormData({ ...formData, prenom: v })}
              placeholder="Prénom"
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
              id="telephone"
              label="Téléphone"
              value={formData.telephone}
              onChange={(v) => setFormData({ ...formData, telephone: v })}
              placeholder="0XXXXXXXXX"
            />
            <TextInput
              id="ville"
              label="Ville"
              value={formData.ville}
              onChange={(v) => setFormData({ ...formData, ville: v })}
              placeholder="Ville"
            />
            <TextInput
              id="cin"
              label="CIN"
              value={formData.cin}
              onChange={(v) => setFormData({ ...formData, cin: v })}
              placeholder="Numéro CIN"
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
          <FormGrid>
            <TextInput
              id="solde"
              label="Solde dû (MAD)"
              type="number"
              value={formData.solde}
              onChange={(v) => setFormData({ ...formData, solde: v })}
              placeholder="0.00"
              step="0.01"
              min={0}
            />
            <TextInput
              id="credit"
              label="Crédit (MAD)"
              type="number"
              value={formData.credit}
              onChange={(v) => setFormData({ ...formData, credit: v })}
              placeholder="0.00"
              step="0.01"
              min={0}
            />
          </FormGrid>
        </FormDialog>

        {/* Dialog Modification */}
        <FormDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          title="Modifier le client"
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
              placeholder="Nom du client"
              required
            />
            <TextInput
              id="edit-prenom"
              label="Prénom"
              value={editFormData.prenom}
              onChange={(v) => setEditFormData({ ...editFormData, prenom: v })}
              placeholder="Prénom"
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
              id="edit-telephone"
              label="Téléphone"
              value={editFormData.telephone}
              onChange={(v) => setEditFormData({ ...editFormData, telephone: v })}
              placeholder="0XXXXXXXXX"
            />
            <TextInput
              id="edit-ville"
              label="Ville"
              value={editFormData.ville}
              onChange={(v) => setEditFormData({ ...editFormData, ville: v })}
              placeholder="Ville"
            />
            <TextInput
              id="edit-cin"
              label="CIN"
              value={editFormData.cin}
              onChange={(v) => setEditFormData({ ...editFormData, cin: v })}
              placeholder="Numéro CIN"
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
          <FormGrid>
            <TextInput
              id="edit-solde"
              label="Solde dû (MAD)"
              type="number"
              value={editFormData.solde}
              onChange={(v) => setEditFormData({ ...editFormData, solde: v })}
              placeholder="0.00"
              step="0.01"
              min={0}
            />
            <TextInput
              id="edit-credit"
              label="Crédit (MAD)"
              type="number"
              value={editFormData.credit}
              onChange={(v) => setEditFormData({ ...editFormData, credit: v })}
              placeholder="0.00"
              step="0.01"
              min={0}
            />
          </FormGrid>
        </FormDialog>

        {/* Dialog Duplicado */}
        <ConfirmDialog
          open={duplicateDialogOpen}
          onOpenChange={setDuplicateDialogOpen}
          title="Client similaire existant"
          description={
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Un client avec les mêmes nom et prénom existe déjà :
              </p>
              {existingClientInfo && (
                <div className="p-4 rounded-lg border bg-muted/50">
                  <p className="font-medium">
                    {existingClientInfo.nom} {existingClientInfo.prenom || ""}
                  </p>
                  {existingClientInfo.telephone && (
                    <p className="text-sm text-muted-foreground">
                      {existingClientInfo.telephone}
                    </p>
                  )}
                </div>
              )}
              <p className="text-sm">
                Êtes-vous sûr qu&apos;il s&apos;agit d&apos;un autre client ?
              </p>
            </div>
          }
          confirmLabel="Oui, créer quand même"
          loadingLabel="Création..."
          onConfirm={() => createClient(true)}
          loading={creating}
        />
      </div>
    </TooltipProvider>
  );
}
