"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getProjectMembers(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .select(`
      id,
      role,
      created_at,
      user:users(id, email, raw_user_meta_data->full_name)
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function inviteProjectMember(
  projectId: string,
  userEmail: string,
  role: "admin" | "member" | "viewer" = "member"
) {
  const supabase = await createClient();

  // Find user by email
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("email", userEmail)
    .single();

  if (userError || !userData) {
    throw new Error("User not found with this email");
  }

  // Add member
  const { error } = await supabase
    .from("project_members")
    .insert({
      project_id: projectId,
      user_id: userData.id,
      role,
    });

  if (error) {
    if (error.code === "23505") {
      throw new Error("User is already a member of this project");
    }
    throw error;
  }

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function updateMemberRole(
  projectId: string,
  memberId: string,
  role: "admin" | "member" | "viewer"
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .update({ role })
    .eq("id", memberId)
    .eq("project_id", projectId);

  if (error) throw error;
  revalidatePath(`/project/${projectId}`);
}

export async function removeProjectMember(projectId: string, memberId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", memberId)
    .eq("project_id", projectId);

  if (error) throw error;
  revalidatePath(`/project/${projectId}`);
}

// Task assignments
export async function assignTask(taskId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_assignees")
    .insert({ task_id: taskId, user_id: userId });

  if (error) {
    if (error.code === "23505") {
      throw new Error("User is already assigned to this task");
    }
    throw error;
  }

  revalidatePath("/");
}

export async function unassignTask(taskId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_assignees")
    .delete()
    .eq("task_id", taskId)
    .eq("user_id", userId);

  if (error) throw error;
  revalidatePath("/");
}

export async function getTaskAssignees(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_assignees")
    .select(`
      id,
      user:users(id, email, raw_user_meta_data->full_name)
    `)
    .eq("task_id", taskId);

  if (error) throw error;
  return data || [];
}
