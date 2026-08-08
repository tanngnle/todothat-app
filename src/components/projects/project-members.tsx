"use client";

import { useState } from "react";
import { UserPlus, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  inviteProjectMember,
  updateMemberRole,
  removeProjectMember,
} from "@/actions/collaboration";

interface ProjectMembersProps {
  projectId: string;
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      email: string;
      full_name?: string;
    };
  }>;
  currentUserId: string;
}

export function ProjectMembers({
  projectId,
  members,
  currentUserId,
}: ProjectMembersProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState("");

  const handleInvite = async () => {
    if (!inviteEmail) return;

    setIsInviting(true);
    setError("");

    try {
      await inviteProjectMember(projectId, inviteEmail, inviteRole);
      setInviteEmail("");
      // Reload page to show new member
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to invite member");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: "admin" | "member" | "viewer") => {
    try {
      await updateMemberRole(projectId, memberId, newRole);
      window.location.reload();
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("Remove this member from the project?")) return;

    try {
      await removeProjectMember(projectId, memberId);
      window.location.reload();
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-500";
      case "admin":
        return "bg-blue-500";
      case "member":
        return "bg-green-500";
      case "viewer":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-4">
      {/* Invite Member */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Project Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {(["admin", "member", "viewer"] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setInviteRole(role)}
                    className={`rounded border p-2 text-sm capitalize ${
                      inviteRole === role
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <div className="rounded bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button
              onClick={handleInvite}
              disabled={isInviting || !inviteEmail}
              className="w-full"
            >
              {isInviting ? "Inviting..." : "Send Invite"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Members List */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Members ({members.length})</h3>
        <div className="space-y-2">
          {members.map((member) => {
            const isOwner = member.user.id === currentUserId;
            return (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                    {(member.user.full_name || member.user.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {member.user.full_name || member.user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRoleBadgeColor(member.role)}>
                    {member.role}
                  </Badge>
                  {!isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.id, "admin")}
                        >
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.id, "member")}
                        >
                          Make Member
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.id, "viewer")}
                        >
                          Make Viewer
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRemove(member.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
