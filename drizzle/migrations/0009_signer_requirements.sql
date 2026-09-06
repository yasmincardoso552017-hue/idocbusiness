ALTER TABLE public.signers
  ADD COLUMN IF NOT EXISTS require_geo boolean,
  ADD COLUMN IF NOT EXISTS require_photo_id boolean,
  ADD COLUMN IF NOT EXISTS require_selfie boolean;