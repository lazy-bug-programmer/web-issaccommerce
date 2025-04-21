/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import {
  createAdminClient,
  createSessionClient,
  getLoggedInUser,
} from "@/lib/appwrite/server";
import { uuidv4 } from "@/lib/guid";
import { cookies } from "next/headers";
import { Query } from "node-appwrite";

export async function signUpUser(
  name: string,
  phone: string,
  password: string,
  confirmPassword: string,
  referralCode?: string
) {
  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const userId = uuidv4();

  try {
    const client = await createAdminClient();
    const user = await client.account.create(
      userId,
      `${userId}@web.com`, // using phone as the email/unique identifier
      password,
      name
    );

    // Update the user labels
    await client.users.updatePhone(user.$id, "+6" + phone);
    await client.users.updateLabels(user.$id, ["CUSTOMER"]);


    // If referral code provided, store it in user preferences
    if (referralCode) {
      await client.users.updatePrefs(user.$id, {
        referralCode: referralCode
      });
    }

    return { message: "Account created successfully", user_id: user.$id };
  } catch (err: any) {
    if (err) {
      switch (err.type) {
        case "user_already_exists":
          return { error: "User already exists" };
      }
    }
    console.error("Sign up error:", err);
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

export async function updateUserPassword(
  userId: string,
  newPassword: string
) {
  try {
    const client = await createAdminClient();

    // Update the password directly without verification
    await client.users.updatePassword(userId, newPassword);

    return {
      success: true,
      message: "Password updated successfully"
    };
  } catch (error) {
    console.error("Error updating password:", error);
    return {
      success: false,
      error: "Failed to update password"
    };
  }
}


/**
 * Get the current user's preferences
 */
export async function getUserPrefs() {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return { error: "User not authenticated" };
    }

    return {
      data: user.prefs || {}
    };
  } catch (error: any) {
    console.error("Error getting user preferences:", error);
    return { error: error.message || "Failed to get user preferences" };
  }
}

/**
 * Update the current user's preferences
 */
export async function updateUserPrefs(prefs: Record<string, any>) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return { error: "User not authenticated" };
    }

    const { account } = await createAdminClient();

    const updatedPrefs = await account.updatePrefs(prefs);

    return { data: updatedPrefs };
  } catch (error: any) {
    console.error("Error updating user preferences:", error);
    return { error: error.message || "Failed to update user preferences" };
  }
}
