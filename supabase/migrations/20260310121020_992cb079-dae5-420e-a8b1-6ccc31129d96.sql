
CREATE OR REPLACE FUNCTION public.update_balance_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.balance_amount := NEW.order_value - NEW.advance_received;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_update_balance
  BEFORE INSERT OR UPDATE OF order_value, advance_received
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_balance_amount();
