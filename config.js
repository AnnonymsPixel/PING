// ============================================================
//  config.js — Central configuration for the Status Bot
// ============================================================

module.exports = {
  // Your Discord User ID (right-click yourself → Copy User ID)
  OWNER_ID: "907496795356143666", 

  // This bot's token 

  // The two bots you want to monitor
  // KEY = friendly name shown in embeds, VALUE = bot's User ID (as string)
  MONITORED_BOTS: {
    "Night Wing ": "1390688361311895644", 
    "Community": "1415253003274948668", 
  },

  // Your server (guild) ID — for instant slash command registration
  GUILD_ID: "1425196013127209022", 

  // Embed colors
  COLORS: {
    ONLINE:  0x2ecc71, // Green
    OFFLINE: 0xe74c3c, // Red
    IDLE:    0xf1c40f, // Yellow
    DND:     0xe67e22, // Orange
    UNKNOWN: 0x95a5a6, // Grey
    MIXED:   0xf1c40f, // Yellow (some online, some offline)
  },

  // Auto-refresh interval in seconds for /status_live (min 10)
  AUTO_REFRESH_SECONDS: 60,
};
