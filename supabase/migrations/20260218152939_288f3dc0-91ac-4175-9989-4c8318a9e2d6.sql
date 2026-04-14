
-- 1. Update handle_new_user to NOT add student role automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$function$;

-- 2. Create trigger to add student role on enrollment (if not already present)
CREATE OR REPLACE FUNCTION public.handle_new_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Add student role only if user doesn't already have it
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_enrollment_created
AFTER INSERT ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_enrollment();
