import { Link, useLocation } from "react-router-dom";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { motion } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Building2,
  Kanban,
  Users,
  FileSignature,
  CheckSquare,
  Settings,
  LogOut,
  ChevronUp,
  Search,
  Map as MapIcon,
  Layers,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", path: "/portal", icon: LayoutDashboard },
  { title: "Organizations", path: "/portal/organizations", icon: Building2 },
  { title: "Engagements", path: "/portal/engagements", icon: Layers },
  { title: "Contacts", path: "/portal/contacts", icon: Users },
  { title: "Map", path: "/portal/map", icon: MapIcon },
  { title: "Pipeline", path: "/portal/pipeline", icon: Kanban },
  { title: "Documents", path: "/portal/signing", icon: FileSignature },
  { title: "Tasks", path: "/portal/tasks", icon: CheckSquare },
  { title: "Settings", path: "/portal/settings/sla", icon: Settings },
];

export function PortalSidebar() {
  const location = useLocation();
  const { data: identity } = useGetIdentity<{ name: string; email: string; avatar?: string }>();
  const { mutate: logout } = useLogout();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-4 py-3">
        <Link to="/portal" className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--gold)' }}>
            S
          </span>
          <span className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--gold)' }}>
            IA Portal
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.path === "/portal"
                  ? location.pathname === "/portal"
                  : location.pathname.startsWith(item.path);
                return (
                  <SidebarMenuItem key={item.path} className="relative">
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-indicator"
                        className="absolute inset-0 rounded-md bg-sidebar-accent"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title} className="relative z-10">
                      <Link to={item.path}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-muted-foreground" tooltip="Search (⌘K)">
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                  <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-12" tooltip={identity?.name ?? "User"}>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={identity?.avatar} />
                    <AvatarFallback className="text-xs">
                      {identity?.name?.charAt(0)?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="font-medium">{identity?.name ?? "User"}</span>
                    <span className="text-xs text-muted-foreground">{identity?.email}</span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
