-- Añadir campo utilisateur_email a historique_inventaire
ALTER TABLE historique_inventaire
ADD COLUMN IF NOT EXISTS utilisateur_email VARCHAR(255);

-- Comentario: Este campo permite mostrar el email del usuario
-- incluso cuando el empleado no tiene un nombre configurado
