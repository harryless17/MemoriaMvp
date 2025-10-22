-- Migration: Add additional fields to profiles table
-- Date: 2025-10-21
-- Description: Ajoute les colonnes bio, location, website, phone, date_of_birth et updated_at

-- Ajouter les nouvelles colonnes à la table profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Créer un index sur updated_at pour les performances
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at_trigger ON public.profiles;
CREATE TRIGGER profiles_updated_at_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- Commentaires pour la documentation
COMMENT ON COLUMN public.profiles.bio IS 'Biographie de l''utilisateur (max 500 caractères recommandé)';
COMMENT ON COLUMN public.profiles.location IS 'Localisation de l''utilisateur (ville, pays)';
COMMENT ON COLUMN public.profiles.website IS 'Site web personnel de l''utilisateur';
COMMENT ON COLUMN public.profiles.phone IS 'Numéro de téléphone de l''utilisateur';
COMMENT ON COLUMN public.profiles.date_of_birth IS 'Date de naissance de l''utilisateur';
COMMENT ON COLUMN public.profiles.updated_at IS 'Date de dernière modification du profil';
