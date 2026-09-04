DROP POLICY IF EXISTS "signer sees own rows" ON public.signers;

-- Signatário vê apenas as linhas que ele mesmo vinculou à sua conta (login após assinar).
CREATE POLICY "signer sees claimed rows"
ON public.signers
FOR SELECT
TO authenticated
USING (claimed_by = auth.uid());