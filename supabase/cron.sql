-- Replace PROJECT_REF and store PUSH_CRON_SECRET in Supabase Vault before scheduling.
-- Enable pg_cron, pg_net, and Vault in the Supabase dashboard first.
select cron.schedule(
  'quiet-maze-push-reminders',
  '*/5 * * * *',
  $$
    select net.http_post(
      url := 'https://PROJECT_REF.supabase.co/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret' limit 1)
      ),
      body := '{}'::jsonb
    );
  $$
);