import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronDown, LogOut } from "lucide-react";
import { authClient } from "@/features/auth/api/client";
import { authSessionQueryOptions, syncObservabilityUser } from "@/features/auth/api/session";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

export interface UserMenuProps {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  } | null;
}

export function UserMenu({ user }: UserMenuProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Button
        className="rounded-xl font-semibold"
        onClick={() => navigate({ to: "/login" })}
        size="sm"
        variant="outline"
      >
        Sign In
      </Button>
    );
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || "U";

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch {
      // Ignore network errors on signout
    }
    syncObservabilityUser(null);
    queryClient.setQueryData(authSessionQueryOptions.queryKey, null);
    queryClient.clear();
    await router.invalidate();
    navigate({ to: "/login" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="User account menu"
          className="border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container text-foreground shadow-tactile flex h-9 cursor-pointer items-center gap-2 rounded-xl border px-2.5 text-xs font-semibold transition-all select-none focus:outline-none"
          type="button"
        >
          <Avatar className="size-6 border-0">
            {user.image && <AvatarImage alt={user.name ?? "Avatar"} src={user.image} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[120px] truncate text-xs font-medium">
            {user.name || user.email}
          </span>
          <ChevronDown className="text-muted-foreground size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-md">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{user.name || "User"}</span>
                {user.role && (
                  <Badge className="text-[10px] font-bold uppercase" variant="outline">
                    {user.role}
                  </Badge>
                )}
              </div>
              <span className="text-muted-foreground truncate text-xs font-normal">
                {user.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer gap-2 text-xs font-medium"
            onClick={handleSignOut}
          >
            <LogOut className="size-3.5" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
