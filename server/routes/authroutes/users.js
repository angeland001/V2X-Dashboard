const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../../database/postgis");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcrypt");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, //5mb
  fileFilter: (req, file, cb) => {
    const allowed = /jepg|jpg|png|gif|webp/;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

router.post(
  "/:userId/profile-picture",
  upload.single("profile_picture"),
  async (req, res) => {
    try {
      const userId = req.params.userId;

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const ext = req.file.mimetype.split("/")[1]; //eg png
      const fileName = `user_${userId}_${Date.now()}.${ext}`;

      //Upload buffer to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return res.status(500).json({ error: "Failed to upload image" });
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      const result = await db.query(
        "UPDATE users SET profile_picture = $1 WHERE id = $2 RETURNING id, username, email, first_name, last_name, profile_picture, role, date_of_birth, created_at",
        [publicUrl, userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        success: true,
        message: "Profile picture updated successfully",
        profile_picture: publicUrl,
        user: result.rows[0],
      });
    } catch (err) {
      console.error("Error updating profile picture:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.put("/:userId/password", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { current_password, new_password } = req.body;

    const result = await db.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const storedHash = result.rows[0].password_hash;

    const isMatch = await bcrypt.compare(current_password, storedHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(new_password, 10);

    await db.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [newHash, userId],
    );

    return res.json({ success: true, message: "Password updated successfully" });

  } catch (err) {
    console.error("Error updating password:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { first_name, last_name, email, role, phone_number } = req.body;

    const result = await db.query(
      `UPDATE users SET first_name = $1, last_name = $2, email = $3, role = $4, phone_number = $5 WHERE id = $6 RETURNING id, username, email, first_name, last_name, profile_picture, role, phone_number, date_of_birth, created_at`,
      [first_name, last_name, email, role, phone_number, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating user profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET endpoint to retrieve user profile
router.get("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const result = await db.query(
      "SELECT id, username, email, first_name, last_name, profile_picture, role, phone_number, date_of_birth, created_at FROM users WHERE id = $1",
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch user", details: error.message });
  }
});

router.delete("/:userId/profile-picture", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Get the current picture URL so we can delete it from storage
    const result = await db.query(
      "SELECT profile_picture FROM users WHERE id = $1",
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentPicture = result.rows[0].profile_picture;

    // Delete from Supabase storage if there is a file
    if (currentPicture) {
      const fileName = currentPicture.split("/avatars/").pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from("avatars")
          .remove([fileName]);
        if (storageError) {
          console.error("Supabase storage delete error:", storageError);
        }
      }
    }

    // Clear the column in the DB
    const updated = await db.query(
      "UPDATE users SET profile_picture = NULL WHERE id = $1 RETURNING id, username, email, first_name, last_name, profile_picture, role, phone_number, date_of_birth, created_at",
      [userId],
    );

    res.json({ success: true, user: updated.rows[0] });
  } catch (err) {
    console.error("Error removing profile picture:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const result = await db.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    await db.query("DELETE FROM users WHERE id = $1", [userId]);

    return res.json({ success: true, message: "Account deleted successfully" });

  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
