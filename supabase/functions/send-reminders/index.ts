import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const cronSecret = Deno.env.get('PUSH_CRON_SECRET')!;
const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:you@example.com', publicKey, privateKey);

const reminders = {
  morning: { title: 'Morning intention', body: 'Day by day: pick one small step and start there.' },
  evening: { title: 'Evening check-in', body: 'Take a moment to log your day, without judgement.' },
  night: { title: 'Wind-down', body: 'Put your phone across the room. Let the day settle.' },
} as const;

function localParts(timeZone: string, now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { date: `${value.year}-${value.month}-${value.day}`, minute: Number(value.hour) * 60 + Number(value.minute) };
}

Deno.serve(async request => {
  if (request.method !== 'POST' || !cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return new Response('Not found', { status: 404 });
  }

  const { data: subscriptions, error } = await supabase.from('push_subscriptions').select('*');
  if (error) return Response.json({ error: 'Could not read subscriptions.' }, { status: 500 });

  const now = new Date();
  let sent = 0;
  let removed = 0;
  for (const subscription of subscriptions ?? []) {
    const local = localParts(subscription.timezone || 'UTC', now);
    const lastSent = subscription.last_sent ?? {};
    const due = Object.keys(reminders).filter(key => {
      if (!subscription.enabled?.[key] || lastSent[`${key}:${local.date}`] === local.date) return false;
      const [hours, minutes] = String(subscription.times?.[key] ?? '00:00').split(':').map(Number);
      const elapsed = (local.minute - (hours * 60 + minutes) + 1440) % 1440;
      return elapsed < 5;
    });
    if (!due.length) continue;

    const sentToday = { ...lastSent };
    for (const key of due) {
      try {
        await webpush.sendNotification(subscription.subscription, JSON.stringify({
          title: reminders[key as keyof typeof reminders].title,
          body: reminders[key as keyof typeof reminders].body,
          tag: `quiet-maze-${key}-${local.date}`,
        }));
        sentToday[`${key}:${local.date}`] = local.date;
        await supabase.from('push_subscriptions').update({ last_sent: sentToday, updated_at: now.toISOString() }).eq('id', subscription.id);
        sent += 1;
      } catch (error) {
        const status = typeof error === 'object' && error !== null && 'statusCode' in error ? Number(error.statusCode) : 0;
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', subscription.id);
          removed += 1;
          break;
        }
      }
    }
  }

  return Response.json({ sent, removed });
});