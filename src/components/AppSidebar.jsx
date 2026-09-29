import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Search } from 'lucide-react';
import { tools } from '@/lib/tools';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';

const CATEGORY_ORDER = ['Organize', 'Convert', 'Optimize', 'Edit', 'Security'];

const SITE_LINKS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/tools', label: 'All tools', icon: LayoutGrid },
];

export default function AppSidebar() {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname, isMobile, setOpenMobile]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? tools.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.slug.includes(q) ||
            t.category.toLowerCase().includes(q),
        )
      : tools;

    return CATEGORY_ORDER.map((category) => ({
      category,
      items: filtered.filter((t) => t.category === category),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  function isToolActive(slug) {
    return location.pathname === `/tools/${slug}`;
  }

  return (
    <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="relative w-full">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <SidebarInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools…"
            className="pl-8 font-mono text-xs"
            aria-label="Search tools"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-hide">
        <SidebarGroup>
          <SidebarGroupLabel>Pages</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SITE_LINKS.map(({ to, label, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild isActive={location.pathname === to} tooltip={label}>
                    <Link to={to}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {grouped.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">No tools match your search.</p>
        ) : (
          grouped.map(({ category, items }) => (
            <SidebarGroup key={category}>
              <SidebarGroupLabel>{category}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <SidebarMenuItem key={tool.slug}>
                        <SidebarMenuButton
                          asChild
                          isActive={isToolActive(tool.slug)}
                          tooltip={tool.title}
                        >
                          <Link to={`/tools/${tool.slug}`}>
                            <Icon />
                            <span>{tool.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {[
            ['/how-it-works', 'How it works'],
            ['/privacy-manifesto', 'Privacy'],
            ['/faq', 'FAQ'],
          ].map(([to, label]) => (
            <SidebarMenuItem key={to}>
              <SidebarMenuButton asChild isActive={location.pathname === to} size="sm">
                <Link to={to}>
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
