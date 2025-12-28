"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Phone,
  Mail,
  MapPin,
  User,
  ArrowLeftRight,
  Filter,
  UserCheck,
  UserPlus,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

interface Etablissement {
  id: string;
  nom: string;
  type: string;
  adresse: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  responsable: string | null;
  note: string | null;
  actif: boolean;
  isPrincipal: boolean;
  isManuel: boolean;
  utilisateurLieUid: string | null;
  createdAt: string;
  _count: {
    confreresSortants: number;
    confreresEntrants: number;
  };
}

interface UtilisateurApp {
  id: string;
  firebaseUid: string;
  nomProjet: string | null;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  ville: string | null;
  projectType: string;
}

const TYPES_ETABLISSEMENT = [
  { value: "pharmacie", label: "Pharmacie" },
  { value: "parapharmacie", label: "Parapharmacie" },
  { value: "depot", label: "Dépôt" },
  { value: "grossiste", label: "Grossiste" },
  { value: "hopital", label: "Hôpital" },
  { value: "autre", label: "Autre" },
];

const getTypeBadgeColor = (type: string) => {
  const colors: Record<string, "success" | "warning" | "info" | "neutral"> = {
    pharmacie: "success",
    parapharmacie: "info",
    depot: "warning",
    grossiste: "neutral",
    hopital: "neutral",
    autre: "neutral",
  };
  return colors[type] || "neutral";
};

export default function EtablissementsPage() {
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEtablissement, setSelectedEtablissement] = useState<Etablissement | null>(null);
  const [saving, setSaving] = useState(false);

  // Mode de création (sélection, existant ou manuel)
  const [createMode, setCreateMode] = useState<"select" | "existant" | "manuel">("select");
  
  // Recherche d'utilisateurs existants
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UtilisateurApp[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showUserResults, setShowUserResults] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UtilisateurApp | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    nom: "",
    type: "pharmacie",
    adresse: "",
    ville: "",
    telephone: "",
    email: "",
    responsable: "",
    note: "",
  });

  const fetchEtablissements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), actif: "true" });
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/etablissements?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur de chargement");

      const data = await res.json();
      setEtablissements(data.etablissements);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => {
    fetchEtablissements();
  }, [fetchEtablissements]);

  // Recherche d'utilisateurs existants
  useEffect(() => {
    const searchUsers = async () => {
      if (!userSearch || userSearch.length < 2) {
        setUserResults([]);
        setShowUserResults(false);
        return;
      }

      setSearchingUsers(true);
      try {
        const res = await fetch(`/api/etablissements?searchUsers=true&search=${encodeURIComponent(userSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setUserResults(data.utilisateurs || []);
          setShowUserResults(true);
        }
      } catch {
        console.error("Erreur recherche utilisateurs");
      } finally {
        setSearchingUsers(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [userSearch]);

  // Fermer résultats au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowUserResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEtablissements();
  };

  const openCreateDialog = () => {
    setSelectedEtablissement(null);
    setCreateMode("select");
    setSelectedUser(null);
    setUserSearch("");
    setUserResults([]);
    setForm({
      nom: "",
      type: "pharmacie",
      adresse: "",
      ville: "",
      telephone: "",
      email: "",
      responsable: "",
      note: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (etablissement: Etablissement) => {
    setSelectedEtablissement(etablissement);
    setCreateMode("manuel"); // Mode édition utilise le formulaire manuel
    setForm({
      nom: etablissement.nom,
      type: etablissement.type,
      adresse: etablissement.adresse || "",
      ville: etablissement.ville || "",
      telephone: etablissement.telephone || "",
      email: etablissement.email || "",
      responsable: etablissement.responsable || "",
      note: etablissement.note || "",
    });
    setDialogOpen(true);
  };

  const selectUserFromResults = (user: UtilisateurApp) => {
    setSelectedUser(user);
    setUserSearch("");
    setShowUserResults(false);
  };

  const handleSubmit = async () => {
    // Mode utilisateur existant
    if (createMode === "existant" && selectedUser) {
      setSaving(true);
      try {
        const res = await fetch("/api/etablissements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isManuel: false,
            utilisateurLieId: selectedUser.id,
            utilisateurLieUid: selectedUser.firebaseUid,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erreur");
        }

        toast.success("Confrère ajouté avec succès");
        setDialogOpen(false);
        fetchEtablissements();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Mode manuel (création ou édition)
    if (!form.nom.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    setSaving(true);
    try {
      const method = selectedEtablissement ? "PUT" : "POST";
      const body = selectedEtablissement 
        ? { ...form, id: selectedEtablissement.id }
        : { ...form, isManuel: true };

      const res = await fetch("/api/etablissements", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      toast.success(selectedEtablissement ? "Établissement modifié" : "Établissement créé");
      setDialogOpen(false);
      fetchEtablissements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEtablissement) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/etablissements?id=${selectedEtablissement.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      toast.success("Établissement supprimé");
      setDeleteDialogOpen(false);
      setSelectedEtablissement(null);
      fetchEtablissements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Confrères & Partenaires
          </h1>
          <p className="text-muted-foreground">
            Gérez vos confrères et établissements partenaires pour les échanges
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un confrère
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Recherche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nom, ville, téléphone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-[150px]">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {TYPES_ETABLISSEMENT.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">
              <Filter className="h-4 w-4 mr-2" />
              Filtrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des confrères</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : etablissements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Aucun confrère trouvé</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Établissement</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Localisation</TableHead>
                      <TableHead>Échanges</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {etablissements.map((etab) => (
                      <TableRow key={etab.id}>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{etab.nom}</p>
                              {etab.isPrincipal && (
                                <Badge variant="info" className="text-xs">
                                  Principal
                                </Badge>
                              )}
                              {!etab.isManuel && (
                                <Badge variant="success" className="text-xs">
                                  <Link2 className="h-3 w-3 mr-1" />
                                  Lié
                                </Badge>
                              )}
                            </div>
                            {etab.responsable && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {etab.responsable}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTypeBadgeColor(etab.type)}>
                            {TYPES_ETABLISSEMENT.find((t) => t.value === etab.type)?.label || etab.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {etab.telephone && (
                              <p className="text-sm flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {etab.telephone}
                              </p>
                            )}
                            {etab.email && (
                              <p className="text-sm flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {etab.email}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(etab.ville || etab.adresse) && (
                            <p className="text-sm flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {etab.ville || etab.adresse}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <ArrowLeftRight className="h-4 w-4" />
                            {etab._count.confreresSortants + etab._count.confreresEntrants}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!etab.isPrincipal && (
                              <>
                                {etab.isManuel && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDialog(etab)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedEtablissement(etab);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Précédent
                  </Button>
                  <span className="flex items-center px-4 text-sm">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedEtablissement ? "Modifier l'établissement" : "Ajouter un confrère"}
            </DialogTitle>
            <DialogDescription>
              {selectedEtablissement
                ? "Modifiez les informations de l'établissement"
                : "Ajoutez un confrère existant dans l'application ou créez-en un manuellement"}
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            {/* Sélection du mode (seulement pour création) */}
            {!selectedEtablissement && createMode === "select" && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setCreateMode("existant")}
                  className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <UserCheck className="h-10 w-10 text-primary" />
                  <div className="text-center">
                    <p className="font-medium">Utilisateur existant</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rechercher un confrère déjà inscrit dans l&apos;application
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode("manuel")}
                  className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <UserPlus className="h-10 w-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">Création manuelle</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ajouter un établissement qui n&apos;utilise pas l&apos;application
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* Mode utilisateur existant */}
            {createMode === "existant" && !selectedEtablissement && (
              <div className="space-y-4">
                {!selectedUser ? (
                  <div className="space-y-2" ref={searchRef}>
                    <Label>Rechercher un confrère</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par nom de pharmacie, ville..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        onFocus={() => userSearch.length >= 2 && setShowUserResults(true)}
                        className="pl-10"
                      />
                      {searchingUsers && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}

                      {showUserResults && userResults.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-64 overflow-auto">
                          {userResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              className="w-full px-4 py-3 text-left hover:bg-accent flex items-center justify-between gap-4 border-b last:border-b-0 transition-colors cursor-pointer"
                              onClick={() => selectUserFromResults(user)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{user.nomProjet || user.nom}</p>
                                <p className="text-xs text-muted-foreground">
                                  {user.ville && `${user.ville} • `}
                                  {user.projectType === "PARAPHARMACIA" ? "Parapharmacie" : "Pharmacie"}
                                </p>
                              </div>
                              <Badge variant="success" className="shrink-0">
                                <Link2 className="h-3 w-3 mr-1" />
                                Inscrit
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}

                      {showUserResults && userSearch.length >= 2 && userResults.length === 0 && !searchingUsers && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
                          <p className="text-sm">Aucun confrère trouvé</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setCreateMode("manuel")}
                            className="mt-2"
                          >
                            Créer manuellement
                          </Button>
                        </div>
                      )}
                    </div>
                    {userSearch.length > 0 && userSearch.length < 2 && (
                      <p className="text-xs text-muted-foreground">
                        Tapez au moins 2 caractères pour rechercher
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border bg-muted/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-lg">{selectedUser.nomProjet || selectedUser.nom}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedUser.projectType === "PARAPHARMACIA" ? "Parapharmacie" : "Pharmacie"}
                          </p>
                          {selectedUser.ville && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {selectedUser.ville}
                            </p>
                          )}
                          {selectedUser.email && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {selectedUser.email}
                            </p>
                          )}
                        </div>
                        <Badge variant="success">
                          <Link2 className="h-3 w-3 mr-1" />
                          Utilisateur lié
                        </Badge>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedUser(null)}
                      className="w-full"
                    >
                      Choisir un autre confrère
                    </Button>
                  </div>
                )}
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateMode("select")}
                  className="w-full"
                >
                  ← Retour
                </Button>
              </div>
            )}

            {/* Mode manuel */}
            {(createMode === "manuel" || selectedEtablissement) && (
              <div className="grid gap-4">
                {!selectedEtablissement && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCreateMode("select")}
                    className="w-fit"
                  >
                    ← Retour
                  </Button>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input
                      id="nom"
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      placeholder="Nom de l'établissement"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES_ETABLISSEMENT.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsable">Responsable</Label>
                  <Input
                    id="responsable"
                    value={form.responsable}
                    onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                    placeholder="Nom du responsable"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input
                      id="telephone"
                      value={form.telephone}
                      onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                      placeholder="0XXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="contact@exemple.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input
                    id="adresse"
                    value={form.adresse}
                    onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                    placeholder="Adresse de l'établissement"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input
                    id="ville"
                    value={form.ville}
                    onChange={(e) => setForm({ ...form, ville: e.target.value })}
                    placeholder="Ville"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Notes</Label>
                  <Textarea
                    id="note"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="Informations supplémentaires..."
                    rows={3}
                  />
                </div>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            {(createMode !== "select") && (
              <Button 
                onClick={handleSubmit} 
                disabled={saving || (createMode === "existant" && !selectedUser)}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selectedEtablissement ? "Enregistrer" : "Ajouter"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer ce confrère ?"
        description={
          selectedEtablissement && (
            <>
              Vous êtes sur le point de supprimer <strong>{selectedEtablissement.nom}</strong>.
              Cette action est irréversible.
            </>
          )
        }
        confirmLabel="Supprimer"
        loadingLabel="Suppression..."
        onConfirm={handleDelete}
        loading={saving}
      />
    </div>
  );
}
