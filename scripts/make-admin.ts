import { db } from "./server/db";
import { members } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function makeAdmin() {
  try {
    console.log("🔍 Looking for user: ajwoodzy007@gmail.com");

    // First, check if the user exists
    const [existingUser] = await db
      .select()
      .from(members)
      .where(eq(members.email, "ajwoodzy007@gmail.com"));

    if (!existingUser) {
      console.log("❌ User ajwoodzy007@gmail.com not found in database");
      return;
    }

    console.log("✅ Found user:", {
      id: existingUser.id,
      email: existingUser.email,
      currentMembershipTier: existingUser.membershipTier,
      currentIsAdmin: existingUser.isAdmin
    });

    // Update the user to be admin
    const result = await db
      .update(members)
      .set({
        isAdmin: true,
        membershipTier: "admin"
      })
      .where(eq(members.email, "ajwoodzy007@gmail.com"))
      .returning();

    if (result.length > 0) {
      console.log("✅ SUCCESS: User updated to admin");
      console.log("📋 Updated user details:", {
        id: result[0].id,
        email: result[0].email,
        membershipTier: result[0].membershipTier,
        isAdmin: result[0].isAdmin
      });
    } else {
      console.log("❌ No rows were updated");
    }

  } catch (error) {
    console.error("❌ Error updating user:", error);
  } finally {
    process.exit(0);
  }
}

makeAdmin();
