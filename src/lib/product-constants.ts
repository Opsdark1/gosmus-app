export const TYPES_PRODUIT = [
  { value: "pharmaceutique", label: "Pharmaceutique" },
  { value: "parapharmaceutique", label: "Parapharmaceutique" },
  { value: "cosmetique", label: "Cosmétique" },
  { value: "hygiene", label: "Hygiène" },
  { value: "materiel_medical", label: "Matériel médical" },
  { value: "complement_alimentaire", label: "Complément alimentaire" },
] as const;

export const SOUS_TYPES_PRODUIT: Record<string, { value: string; label: string }[]> = {
  pharmaceutique: [
    { value: "antalgique", label: "Antalgique" },
    { value: "antibiotique", label: "Antibiotique" },
    { value: "anti_inflammatoire", label: "Anti-inflammatoire" },
    { value: "antihistaminique", label: "Antihistaminique" },
    { value: "antiacide", label: "Antiacide" },
    { value: "antitussif", label: "Antitussif" },
    { value: "laxatif", label: "Laxatif" },
    { value: "antidiarrheique", label: "Antidiarrhéique" },
    { value: "antiseptique", label: "Antiseptique" },
    { value: "vitamines", label: "Vitamines" },
    { value: "cardiovasculaire", label: "Cardiovasculaire" },
    { value: "dermatologique", label: "Dermatologique" },
    { value: "ophtalmique", label: "Ophtalmique" },
    { value: "orl", label: "ORL" },
  ],
  parapharmaceutique: [
    { value: "soin_bebe", label: "Soin bébé" },
    { value: "nutrition_infantile", label: "Nutrition infantile" },
    { value: "soin_minceur", label: "Soin minceur" },
    { value: "soin_solaire", label: "Soin solaire" },
    { value: "aromatherapie", label: "Aromathérapie" },
    { value: "homeopathie", label: "Homéopathie" },
    { value: "orthopédie", label: "Orthopédie" },
    { value: "premiers_secours", label: "Premiers secours" },
  ],
  cosmetique: [
    { value: "soin_visage", label: "Soin visage" },
    { value: "soin_corps", label: "Soin corps" },
    { value: "soin_cheveux", label: "Soin cheveux" },
    { value: "maquillage", label: "Maquillage" },
    { value: "parfum", label: "Parfum" },
    { value: "anti_age", label: "Anti-âge" },
    { value: "hydratant", label: "Hydratant" },
  ],
  hygiene: [
    { value: "hygiene_bucco_dentaire", label: "Hygiène bucco-dentaire" },
    { value: "hygiene_corporelle", label: "Hygiène corporelle" },
    { value: "hygiene_feminine", label: "Hygiène féminine" },
    { value: "hygiene_capillaire", label: "Hygiène capillaire" },
    { value: "deodorant", label: "Déodorant" },
    { value: "rasage", label: "Rasage" },
  ],
  materiel_medical: [
    { value: "tensiometre", label: "Tensiomètre" },
    { value: "glucometre", label: "Glucomètre" },
    { value: "thermometre", label: "Thermomètre" },
    { value: "nebuliseur", label: "Nébuliseur" },
    { value: "oxymetre", label: "Oxymètre" },
    { value: "bandage", label: "Bandage" },
    { value: "seringue", label: "Seringue" },
    { value: "compresse", label: "Compresse" },
    { value: "attelle", label: "Attelle" },
    { value: "fauteuil_roulant", label: "Fauteuil roulant" },
  ],
  complement_alimentaire: [
    { value: "multivitamine", label: "Multivitamine" },
    { value: "omega_3", label: "Oméga 3" },
    { value: "probiotique", label: "Probiotique" },
    { value: "magnesium", label: "Magnésium" },
    { value: "fer", label: "Fer" },
    { value: "calcium", label: "Calcium" },
    { value: "vitamine_d", label: "Vitamine D" },
    { value: "vitamine_c", label: "Vitamine C" },
    { value: "zinc", label: "Zinc" },
    { value: "spiruline", label: "Spiruline" },
  ],
};

export function getTypeLabel(type: string | null): string {
  if (!type) return "—";
  const found = TYPES_PRODUIT.find((t) => t.value === type);
  return found ? found.label : type;
}

export function getSousTypeLabel(type: string | null, sousType: string | null): string {
  if (!sousType || !type) return "—";
  const sousTypes = SOUS_TYPES_PRODUIT[type];
  if (!sousTypes) return sousType;
  const found = sousTypes.find((st) => st.value === sousType);
  return found ? found.label : sousType;
}
