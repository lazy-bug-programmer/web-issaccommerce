"use server";

import {
  createAdminClient,
  createSessionClient,
} from "@/lib/appwrite/server";
import { uuidv4 } from "@/lib/guid";
import { cookies } from "next/headers";
import { Query } from "node-appwrite";

export async function signUpUser(
  name: string,
  phone: string,
  password: string,
  confirmPassword: string
) {
  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  try {
    const client = await createAdminClient();
    const userId = uuidv4();

    // Create the user account
    const user = await client.account.create(userId, userId + '@web.com', password, name);

    // Update the user to include phone number
    await client.users.updatePhone(user.$id, "+6" + phone);
    await client.users.updateLabels(user.$id, ['SELLER']);

    return { message: "Account created successfully" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err) {
      switch (err.type) {
        case "user_already_exists":
          return { error: "User already exists" };
      }
    }
    return { error: "Create account failed" };
  }
}

export async function lookupUserByPhone(phone: string) {
  try {
    const client = await createAdminClient();

    // Find the user by phone number
    const users = await client.users.list(
      [Query.equal("phone", '+6' + phone),]
    );

    if (users.total === 0) {
      return { error: "User not found" };
    }

    const user = users.users[0];
    const userEmail = user.email;

    // Return only the email for client-side login
    return {
      email: userEmail
    };
  } catch {
    return { error: "User lookup failed" };
  }
}

export async function logoutUser() {
  try {
    const client = await createSessionClient();
    const sessionId = ((await cookies()).get("user-session-id"));
    (await cookies()).delete("user-session");
    (await cookies()).delete("user-session-id");
    await client.account.deleteSession(sessionId!.value);
    return { message: "Logout successful" };
  } catch {
    return { error: "Logout failed" };
  }
}

export async function updateUserInfo(
  userId: string,
  name: string,
  phone: string
) {
  try {
    const client = await createAdminClient();

    // Update user name
    await client.users.updateName(userId, name);

    // Update phone number (ensuring it has the +6 prefix)
    const formattedPhone = phone.startsWith('+6') ? phone : '+6' + phone;
    await client.users.updatePhone(userId, formattedPhone);

    return { success: true, message: "Profile updated successfully" };
  } catch (error) {
    console.error("Error updating user info:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

export async function getUserById(userId: string) {
  try {
    const client = await createAdminClient();

    // Fetch the user by ID
    const user = await client.users.get(userId);

    return {
      success: true,
      user: {
        id: user.$id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    };
  } catch (error) {
    console.error("Error fetching user:", error);
    return { success: false, error: "Failed to fetch user information" };
  }
}
