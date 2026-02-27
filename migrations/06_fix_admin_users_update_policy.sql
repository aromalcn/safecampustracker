-- Create a policy that allows admins to update any user
CREATE POLICY "Admins can update all users"
ON public.users
FOR UPDATE
USING (
  (SELECT role FROM public.users WHERE uid = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.users WHERE uid = auth.uid()) = 'admin'
);
