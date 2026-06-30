create table if not exists public.reports (
  id uuid primary key,
  report_url text not null,
  report_type text not null,
  report_reason text not null,
  contact text,
  image_url text,
  status text not null default '待处理',
  created_at timestamptz not null default now()
);

create index if not exists reports_status_idx on public.reports(status);
create index if not exists reports_report_url_idx on public.reports(report_url);
