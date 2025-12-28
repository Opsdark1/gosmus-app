"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { sortItems } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import { SortableHeader, SortDirection } from "@/components/ui/sortable-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Search, Package, Eye, Loader2, Trash2, Plus, FolderPlus, Settings, Pencil } from "lucide-react";
import { TYPES_PRODUIT, SOUS_TYPES_PRODUIT, getTypeLabel, getSousTypeLabel } from "@/lib/product-constants";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PAGE_SIZE = 10;

interface Categorie {
  id: string;
  nom: string;
  description: string | null;
}

interface Stock {
  id: string;
  prixVente: string | number;
  quantiteDisponible: number;
}

interface Produit {
  id: string;
  nom: string;
  codeBarre: string | null;
  type: string | null;
  sousType: string | null;
  description: string | null;
  categorie: Categorie | null;
  stocks?: Stock[];
  createdAt: string;
}

export default function ProduitsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  const [filterCategorie, setFilterCategorie] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStock, setFilterStock] = useState("all");
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);
  const [createCategorieDialogOpen, setCreateCategorieDialogOpen] = useState(false);
  const [deleteCategorieDialogOpen, setDeleteCategorieDialogOpen] = useState(false);
  const [categorieToDelete, setCategorieToDelete] = useState<Categorie | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>("nom");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [formData, setFormData] = useState({
    nom: "",
    codeBarre: "",
    type: "",
    sousType: "",
    categorieId: "",
    description: "",
  });

  const [categorieForm, setCategorieForm] = useState({
    nom: "",
    description: "",
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const fetchProduits = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }
      const response = await fetch(`/api/produits?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors du chargement");
      }

      const data = await response.json();
      setProduits(data.produits || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      setProduits([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {
      console.error("Erreur chargement catégories");
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    fetchProduits();
  }, [fetchProduits]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const getTotalStock = (produit: Produit): number => {
    if (produit.stocks && produit.stocks.length > 0) {
      return produit.stocks.reduce((sum, s) => sum + s.quantiteDisponible, 0);
    }
    return 0;
  };

  const filteredProduits = useMemo(() => {
    return produits.filter(p => {
      if (filterCategorie !== "all" && p.categorie?.id !== filterCategorie) return false;
      if (filterType !== "all" && p.type !== filterType) return false;
      const stock = getTotalStock(p);
      if (filterStock === "avec" && stock <= 0) return false;
      if (filterStock === "sans" && stock > 0) return false;
      return true;
    });
  }, [produits, filterCategorie, filterType, filterStock]);

  const sortedProduits = useMemo(() => {
    return sortItems({
      items: filteredProduits,
      sortKey,
      sortDirection,
      getValue: (p, key) => {
        switch (key) {
          case "nom": return p.nom;
          case "type": return p.type || "";
          case "categorie": return p.categorie?.nom || "";
          case "stock": return getTotalStock(p);
          default: return null;
        }
      },
    });
  }, [filteredProduits, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedProduits.length / PAGE_SIZE);
  const paginatedProduits = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedProduits.slice(start, start + PAGE_SIZE);
  }, [sortedProduits, currentPage]);

  const resetForm = () => {
    setFormData({
      nom: "",
      codeBarre: "",
      type: "",
      sousType: "",
      categorieId: "",
      description: "",
    });
  };

  const resetCategorieForm = () => {
    setCategorieForm({ nom: "", description: "" });
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openDetails = (produit: Produit) => {
    setSelectedProduit(produit);
    setDialogOpen(true);
  };

  const openEditDialog = (produit: Produit) => {
    setSelectedProduit(produit);
    setFormData({
      nom: produit.nom,
      codeBarre: produit.codeBarre || "",
      type: produit.type || "",
      sousType: produit.sousType || "",
      categorieId: produit.categorie?.id || "",
      description: produit.description || "",
    });
    setEditDialogOpen(true);
  };

  const sousTypesForCurrentType = formData.type ? SOUS_TYPES_PRODUIT[formData.type] || [] : [];

  const handleTypeChange = (value: string) => {
    setFormData({ ...formData, type: value, sousType: "" });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/produits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: formData.nom.trim(),
          codeBarre: formData.codeBarre.trim() || null,
          type: formData.type || null,
          sousType: formData.sousType || null,
          categorieId: formData.categorieId || null,
          description: formData.description.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur création");
      }

      toast.success("Produit créé avec succès");
      setCreateDialogOpen(false);
      resetForm();
      fetchProduits();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduit) return;
    if (!formData.nom.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/produits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedProduit.id,
          nom: formData.nom.trim(),
          codeBarre: formData.codeBarre.trim() || null,
          type: formData.type || null,
          sousType: formData.sousType || null,
          categorieId: formData.categorieId || null,
          description: formData.description.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur modification");
      }

      toast.success("Produit modifié avec succès");
      setEditDialogOpen(false);
      setSelectedProduit(null);
      resetForm();
      fetchProduits();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduit) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/produits?id=${selectedProduit.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur suppression");
      }

      toast.success("Produit supprimé avec succès");
      setDeleteDialogOpen(false);
      setDialogOpen(false);
      setSelectedProduit(null);
      fetchProduits();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categorieForm.nom.trim()) {
      toast.error("Le nom de la catégorie est requis");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: categorieForm.nom.trim(),
          description: categorieForm.description.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur création catégorie");
      }

      toast.success("Catégorie créée avec succès");
      setCreateCategorieDialogOpen(false);
      resetCategorieForm();
      await fetchCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteCategorieDialog = (cat: Categorie) => {
    setCategorieToDelete(cat);
    setDeleteCategorieDialogOpen(true);
  };

  const handleDeleteCategorie = async () => {
    if (!categorieToDelete) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/categories?id=${categorieToDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur suppression");
      }
      toast.success("Catégorie supprimée");
      setDeleteCategorieDialogOpen(false);
      setCategorieToDelete(null);
      await fetchCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Produits</h1>
          <p className="text-muted-foreground">Gérez votre catalogue de produits</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCategoriesDialogOpen(true)} className="flex-1 sm:flex-none">
            <Settings className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Catégories</span>
            <span className="sm:hidden">Cat.</span>
          </Button>
          <Button onClick={openCreateDialog} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nouveau produit</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 sm:pt-6">
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              <Select value={filterCategorie} onValueChange={(v) => { setFilterCategorie(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={(v) => { setFilterType(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  {TYPES_PRODUIT.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStock} onValueChange={(v) => { setFilterStock(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tout stock</SelectItem>
                  <SelectItem value="avec">Avec stock</SelectItem>
                  <SelectItem value="sans">Sans stock</SelectItem>
                </SelectContent>
              </Select>
              {(filterCategorie !== "all" || filterType !== "all" || filterStock !== "all") && (
                <Button variant="ghost" size="sm" className="col-span-2 sm:col-span-1" onClick={() => { setFilterCategorie("all"); setFilterType("all"); setFilterStock("all"); }}>
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-card p-6">
            <LoadingState />
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Produits ({filteredProduits.length})</h3>
          </div>
          <div className="p-0">
            {produits.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Aucun produit trouvé"
                message="Créez votre premier produit pour commencer"
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">
                          <SortableHeader
                            label="Nom"
                            sortKey="nom"
                            currentSort={sortKey}
                            currentDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="text-left py-3 px-4 hidden md:table-cell">
                          <SortableHeader
                            label="Type"
                            sortKey="type"
                            currentSort={sortKey}
                            currentDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="text-left py-3 px-4 hidden lg:table-cell">
                          <SortableHeader
                            label="Catégorie"
                            sortKey="categorie"
                            currentSort={sortKey}
                            currentDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="text-left py-3 px-4">
                          <SortableHeader
                            label="Stock"
                            sortKey="stock"
                            currentSort={sortKey}
                            currentDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProduits.map((produit) => {
                        const stock = getTotalStock(produit);
                        return (
                          <tr key={produit.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="font-medium">{produit.nom}</div>
                              {produit.codeBarre && (
                                <div className="text-xs text-muted-foreground">{produit.codeBarre}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 hidden md:table-cell">
                              <Badge variant="info">{getTypeLabel(produit.type)}</Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">
                              {produit.categorie?.nom || "—"}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={stock > 0 ? "success" : "warning"}>
                                {stock} unités
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetails(produit)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Voir détails</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(produit)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Modifier</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                      setSelectedProduit(produit);
                                      setDeleteDialogOpen(true);
                                    }}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Supprimer</TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
                    <PaginationInfo
                      currentPage={currentPage}
                      pageSize={PAGE_SIZE}
                      totalItems={sortedProduits.length}
                    />
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Nouveau produit</DialogTitle>
            <DialogDescription>Ajoutez un nouveau produit à votre catalogue.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <DialogBody>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom du produit *</Label>
                  <Input
                    placeholder="Nom du produit"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Code-barres</Label>
                  <Input
                    placeholder="Code-barres du produit"
                    value={formData.codeBarre}
                    onChange={(e) => setFormData({ ...formData, codeBarre: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formData.type} onValueChange={handleTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES_PRODUIT.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Sous-type</Label>
                    <Select
                      value={formData.sousType}
                      onValueChange={(value) => setFormData({ ...formData, sousType: value })}
                      disabled={!formData.type || sousTypesForCurrentType.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.type ? "Sélectionner" : "Choisir un type d'abord"} />
                      </SelectTrigger>
                      <SelectContent>
                        {sousTypesForCurrentType.map((st) => (
                          <SelectItem key={st.value} value={st.value}>
                            {st.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Catégorie</Label>
                    {categories.length === 0 && !loadingCategories && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs text-primary"
                        onClick={() => setCreateCategorieDialogOpen(true)}
                      >
                        <FolderPlus className="h-3 w-3 mr-1" />
                        Créer une catégorie
                      </Button>
                    )}
                  </div>
                  {categories.length === 0 && !loadingCategories ? (
                    <div className="rounded-md border border-dashed p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Aucune catégorie disponible
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCreateCategorieDialogOpen(true)}
                      >
                        <FolderPlus className="h-4 w-4 mr-2" />
                        Créer une catégorie
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={formData.categorieId}
                      onValueChange={(value) => setFormData({ ...formData, categorieId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Description du produit..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Créer le produit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setSelectedProduit(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
            <DialogDescription>Modifiez les informations du produit.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <DialogBody>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom du produit *</Label>
                  <Input
                    placeholder="Nom du produit"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Code-barres</Label>
                  <Input
                    placeholder="Code-barres du produit"
                    value={formData.codeBarre}
                    onChange={(e) => setFormData({ ...formData, codeBarre: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formData.type} onValueChange={handleTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES_PRODUIT.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Sous-type</Label>
                    <Select
                      value={formData.sousType}
                      onValueChange={(value) => setFormData({ ...formData, sousType: value })}
                      disabled={!formData.type || sousTypesForCurrentType.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.type ? "Sélectionner" : "Choisir un type d'abord"} />
                      </SelectTrigger>
                      <SelectContent>
                        {sousTypesForCurrentType.map((st) => (
                          <SelectItem key={st.value} value={st.value}>
                            {st.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select
                    value={formData.categorieId}
                    onValueChange={(value) => setFormData({ ...formData, categorieId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Description du produit..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails du produit</DialogTitle>
          </DialogHeader>
          {selectedProduit && (
            <DialogBody>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nom</p>
                    <p className="text-sm">{selectedProduit.nom}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Code-barres</p>
                    <p className="text-sm">{selectedProduit.codeBarre || "—"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <p className="text-sm">{getTypeLabel(selectedProduit.type)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sous-type</p>
                    <p className="text-sm">
                      {getSousTypeLabel(selectedProduit.type, selectedProduit.sousType)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Catégorie</p>
                    <p className="text-sm">{selectedProduit.categorie?.nom || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Stock total</p>
                    <Badge variant={getTotalStock(selectedProduit) > 0 ? "success" : "warning"}>
                      {getTotalStock(selectedProduit)} unités
                    </Badge>
                  </div>
                </div>
                {selectedProduit.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm">{selectedProduit.description}</p>
                  </div>
                )}
              </div>
            </DialogBody>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer le produit"
        description={<>Êtes-vous sûr de vouloir supprimer <strong>{selectedProduit?.nom}</strong> ? Cette action est irréversible.</>}
        confirmLabel="Supprimer"
        loadingLabel="Suppression..."
        onConfirm={handleDelete}
        loading={submitting}
      />

      <Dialog open={categoriesDialogOpen} onOpenChange={setCategoriesDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Gestion des catégories</DialogTitle>
            <DialogDescription>Créez et gérez les catégories de produits.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setCreateCategorieDialogOpen(true)}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Nouvelle catégorie
              </Button>

              {loadingCategories ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune catégorie créée
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{cat.nom}</p>
                        {cat.description && (
                          <p className="text-sm text-muted-foreground">{cat.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDeleteCategorieDialog(cat)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoriesDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createCategorieDialogOpen} onOpenChange={setCreateCategorieDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Nouvelle catégorie</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategorie}>
            <DialogBody>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom de la catégorie *</Label>
                  <Input
                    placeholder="Nom de la catégorie"
                    value={categorieForm.nom}
                    onChange={(e) => setCategorieForm({ ...categorieForm, nom: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Description de la catégorie..."
                    value={categorieForm.description}
                    onChange={(e) => setCategorieForm({ ...categorieForm, description: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateCategorieDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteCategorieDialogOpen}
        onOpenChange={setDeleteCategorieDialogOpen}
        title="Supprimer la catégorie"
        description={<>Êtes-vous sûr de vouloir supprimer la catégorie <strong>&quot;{categorieToDelete?.nom}&quot;</strong> ? Cette action est irréversible.</>}
        confirmLabel="Supprimer"
        loadingLabel="Suppression..."
        onConfirm={handleDeleteCategorie}
        loading={submitting}
      />
    </div>
    </TooltipProvider>
  );
}
