-- Import Sagi's localStorage transactions into Supabase.
--
-- Run this after:
-- 1. supabase/schema.sql has been applied.
-- 2. The admin profile exists in public.profiles with username = 'sagi'.
--
-- The insert is idempotent: running it again updates the same transaction IDs.

with owner_profile as (
  select id as owner_id
  from public.profiles
  where username = 'sagi'
  limit 1
)
insert into public.transactions (
  id,
  owner_id,
  type,
  amount,
  field,
  recurrence,
  date,
  end_date,
  notes
)
select
  source.id::uuid,
  owner_profile.owner_id,
  source.type,
  source.amount,
  source.field,
  source.recurrence,
  source.date::date,
  source.end_date::date,
  source.notes
from owner_profile
cross join (
  values
    ('c0337bf0-4a39-43bc-814f-4198a0e0e693', 'outcome', 3300, 'personal', 'recurring', '2026-07-01', '2027-07-01', 'שכירות'),
    ('1569b8a7-54f9-4b98-827f-68fe31d959bf', 'outcome', 2800, 'business', 'recurring', '2026-07-01', null, 'משרד'),
    ('21e7a7ba-7bbc-4655-b085-0ca049dd078f', 'outcome', 1960, 'personal', 'recurring', '2026-07-22', null, 'הלוואה'),
    ('8da0a703-987d-4475-8fb0-e9ad12d8f575', 'outcome', 2018, 'personal', 'recurring', '2026-07-10', null, 'פנסיה והשתלמות'),
    ('b0b8272a-12f6-43fe-9bf5-4e904a875ac9', 'outcome', 764, 'personal', 'recurring', '2026-07-05', null, 'ארנונה'),
    ('2434228e-d356-455e-bd18-9a9ef3554ec2', 'outcome', 600, 'personal', 'recurring', '2026-07-01', null, 'חוגים וכיף'),
    ('916fccc0-ee12-43bf-a3a9-714f747c3c0f', 'income', 18231, 'personal', 'one-time', '2026-06-30', null, 'התחלה'),
    ('5f9d2717-7b5b-4037-be9e-90e116cc160e', 'outcome', 15000, 'personal', 'one-time', '2026-08-10', null, ''),
    ('1be4e9c6-1daa-4c44-9774-cdbdf1e63ac8', 'income', 18231, 'personal', 'one-time', '2026-07-01', null, ''),
    ('86e6e37b-a683-4ee7-afed-bb6aeac9ab58', 'outcome', 4100, 'personal', 'one-time', '2026-08-09', null, 'קטיה'),
    ('8f70437d-a3e3-40c0-9ad7-e9a7dbb9f8e8', 'income', 5074, 'business', 'one-time', '2026-08-02', null, 'יוניקס יוני'),
    ('0c573c5d-8506-442a-a57b-6af7822d2a50', 'income', 7200, 'business', 'one-time', '2026-07-20', null, 'מזוזאס שמחה'),
    ('b887adda-98bd-4007-a987-f35991ba3c6d', 'income', 1270, 'business', 'recurring', '2026-08-02', null, 'יוניקס עמלות'),
    ('d2b1c61c-3032-4489-9969-cb58ec2dd81f', 'income', 2600, 'business', 'one-time', '2026-07-21', null, 'סייברלאבס'),
    ('27710865-a675-47a6-bb57-596e5ed6a78c', 'income', 5900, 'business', 'one-time', '2026-07-23', null, 'Ice Diamonds'),
    ('e3edd1e4-8cc7-4afa-92d9-53a89d1e422b', 'income', 4500, 'business', 'one-time', '2026-07-24', null, 'Dust Doctors'),
    ('b3b65ec7-f07d-4c3a-88d1-f893c778255c', 'income', 5000, 'business', 'one-time', '2026-07-30', null, 'Casa Pattaya Catalog'),
    ('b45629e4-b890-4e9b-86cd-7e370e98a21f', 'income', 3540, 'business', 'one-time', '2026-07-25', null, 'קרנית'),
    ('375dfcaa-5df9-4ab7-8171-d9a5df25ba99', 'income', 11800, 'business', 'one-time', '2026-07-26', null, 'מקדמות פרויקטים אחרים'),
    ('570059f3-62ff-4927-9308-3e96b217241d', 'income', 26000, 'business', 'one-time', '2026-09-03', null, 'יוניקס נגישות אקיפ, בונים נדלן, נינא, אתר מייפליי,'),
    ('430d3346-68f8-493b-866a-3dc88b9a7ea5', 'income', 15000, 'business', 'one-time', '2026-08-15', null, 'נפש בנפש'),
    ('efa77f49-d804-43d3-8c70-b032292b7ad4', 'income', 5000, 'business', 'one-time', '2026-08-15', null, 'Casa Pattaya Grand Bay View'),
    ('c75f9b7f-d4cd-4b14-8bb6-59d6475e2432', 'income', 10800, 'business', 'one-time', '2026-08-30', null, 'מזוזאס סיום'),
    ('e1796aa7-e912-48b3-9a60-6023d153c17e', 'outcome', 20000, 'personal', 'one-time', '2026-08-31', null, 'IBI')
) as source (
  id,
  type,
  amount,
  field,
  recurrence,
  date,
  end_date,
  notes
)
on conflict (id) do update set
  type = excluded.type,
  amount = excluded.amount,
  field = excluded.field,
  recurrence = excluded.recurrence,
  date = excluded.date,
  end_date = excluded.end_date,
  notes = excluded.notes;
