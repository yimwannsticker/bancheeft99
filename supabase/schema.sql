-- บัญชีคู่รัก: โครงสร้างฐานข้อมูล Supabase
-- วิธีใช้: เปิด Supabase Dashboard -> SQL Editor -> วางไฟล์นี้ทั้งหมด -> กด Run

create extension if not exists pgcrypto;

create table if not exists rooms (
  id text primary key,
  name_a text not null default 'เตย',
  name_b text not null default 'เฟิร์ส',
  created_at timestamptz not null default now()
);

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references rooms(id) on delete cascade,
  created_at timestamptz not null default now(),
  spent_at timestamptz not null,
  payer text not null check (payer in ('a', 'b')),
  description text not null,
  category text not null default 'อื่นๆ',
  amount_satang bigint not null check (amount_satang > 0),
  split_type text not null check (split_type in ('equal', 'full', 'personal', 'settlement')),
  deleted_at timestamptz
);

create index if not exists entries_room_id_idx on entries (room_id);
create index if not exists entries_room_spent_at_idx on entries (room_id, spent_at);

-- เปิด Row Level Security แล้วอนุญาตให้ทุกคนที่มี anon key อ่าน/เขียนได้
-- (แอพนี้ไม่มีระบบสมัครสมาชิก ความเป็นส่วนตัวขึ้นกับการไม่แชร์ลิงก์ห้อง/anon key ให้คนอื่น
--  ไม่เหมาะกับข้อมูลอ่อนไหวระดับธนาคาร แต่พอเหมาะสำหรับใช้กันเองสองคน)
alter table rooms enable row level security;
alter table entries enable row level security;

drop policy if exists "allow all rooms" on rooms;
create policy "allow all rooms" on rooms for all using (true) with check (true);

drop policy if exists "allow all entries" on entries;
create policy "allow all entries" on entries for all using (true) with check (true);

-- เปิดใช้ Realtime สำหรับตาราง entries (ให้สองเครื่องเห็นข้อมูลใหม่ทันที)
alter publication supabase_realtime add table entries;
