// ============================================================
//  statusChecker.js — Presence resolution & embed builder
// ============================================================

const { EmbedBuilder } = require("discord.js");
const { COLORS, MONITORED_BOTS } = require("./config");

const STATUS_MAP = {
  online:    { label: "Online",         icon: "🟢", color: COLORS.ONLINE  },
  idle:      { label: "Idle",           icon: "🌙", color: COLORS.IDLE    },
  dnd:       { label: "Do Not Disturb", icon: "⛔", color: COLORS.DND     },
  offline:   { label: "Offline",        icon: "🔴", color: COLORS.OFFLINE },
  invisible: { label: "Offline",        icon: "🔴", color: COLORS.OFFLINE },
};

/**
 * Get a guild member's presence info by user ID.
 */
function getMemberStatus(guild, botId) {
  const member = guild.members.cache.get(botId);
  if (!member) return { icon: "❓", label: "Not in Server", color: COLORS.UNKNOWN, member: null };

  const status = member.presence?.status ?? "offline";
  const { icon, label, color } = STATUS_MAP[status] ?? { icon: "❓", label: "Unknown", color: COLORS.UNKNOWN };

  return { icon, label, color, member };
}

/**
 * Build the main live status embed — structured dashboard + incident board style.
 */
function buildStatusEmbed(guild) {
  let onlineCount  = 0;
  let offlineCount = 0;
  const botLines   = [];

  for (const [name, botId] of Object.entries(MONITORED_BOTS)) {
    const { icon, member } = getMemberStatus(guild, botId);

    const isOnline = member
      ? !["offline", "invisible"].includes(member.presence?.status ?? "offline")
      : false;

    if (isOnline) onlineCount++;
    else offlineCount++;

    // Skip Custom Status (type 4), pick first real activity
    const activity = member?.presence?.activities?.find((a) => a.type !== 4)?.name ?? null;

    // Human-readable operational label
    let operationalLabel;
    if (!member)                                 operationalLabel = "Not in Server";
    else if (!isOnline)                          operationalLabel = "Offline";
    else if (member.presence?.status === "dnd")  operationalLabel = "Degraded";
    else if (member.presence?.status === "idle") operationalLabel = "Idle";
    else                                         operationalLabel = "Operational";

    botLines.push({ name, icon, operationalLabel, activity, isOnline });
  }

  // Overall color & health banner
  let embedColor, healthIcon, healthText;
  if (offlineCount === 0) {
    embedColor = COLORS.ONLINE;
    healthIcon = "✅";
    healthText = "All Systems Operational";
  } else if (onlineCount === 0) {
    embedColor = COLORS.OFFLINE;
    healthIcon = "🚨";
    healthText = "Outage Detected";
  } else {
    embedColor = COLORS.MIXED;
    healthIcon = "⚠️";
    healthText = "Degraded Performance";
  }

  // Progress bar
  const totalBots    = onlineCount + offlineCount;
  const filledBlocks = Math.round((onlineCount / totalBots) * 10);
  const progressBar  = "▰".repeat(filledBlocks) + "▱".repeat(10 - filledBlocks);

  const DIVIDER = "⎯".repeat(34);

  // Per-bot blocks separated by dividers
  const botSection = botLines
    .map(({ name, icon, operationalLabel, activity }) => {
      const activityLine = activity ? `\n> *${activity}*` : "";
      return `${icon}  **${name}**\n\`${operationalLabel}\`${activityLine}`;
    })
    .join(`\n${DIVIDER}\n`);

  const embed = new EmbedBuilder()
    .setTitle("◈  System Status")
    .setDescription(
      `${healthIcon}  **${healthText}**\n` +
      `\`${progressBar}\`  **${onlineCount}/${totalBots}** operational\n` +
      `Monitoring **${guild.name}**\n` +
      `${DIVIDER}\n` +
      `${botSection}\n` +
      `${DIVIDER}`
    )
    .setColor(embedColor)
    .setFooter({ text: "↻  Refreshes every 60s  •  Last refreshed" })
    .setTimestamp();

  return embed;
}

module.exports = { getMemberStatus, buildStatusEmbed };