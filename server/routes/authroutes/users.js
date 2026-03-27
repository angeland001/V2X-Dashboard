const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../../database/postgis");
const { createClient } = require("@supabase/supabase-js");

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

router.put("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { first_name, last_name, email, role } = req.body;

    const result = await db.query(
      `UPDATE users SET first_name = $1, last_name = $2, email = $3, role = $4 WHERE id = $5 RETURNING id, username, email, first_name, last_name, profile_picture, role, date_of_birth, created_at`,
      [first_name, last_name, email, role, userId],
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
      "SELECT id, username, email, first_name, last_name, profile_picture, role, date_of_birth, created_at FROM users WHERE id = $1",
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

module.exports = router;
