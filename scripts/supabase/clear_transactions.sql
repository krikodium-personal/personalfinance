-- Limpieza de registros de transacciones en Supabase
-- Uso: pegar este script en SQL Editor y ejecutar.
-- Recomendado: usar la opcion por usuario.

begin;

-- OPCION 1 (RECOMENDADA): borrar solo las transacciones del usuario autenticado.
delete from public.transactions
where user_id = auth.uid();

-- OPCION 2 (GLOBAL): borrar TODAS las transacciones de todos los usuarios.
-- Descomentar solo si realmente queres vaciar toda la tabla.
-- delete from public.transactions;

commit;

-- Verificacion rapida:
-- select count(*) as remaining_rows from public.transactions;
