const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  MessageFlags,
} = require("discord.js");
const dotenv = require("dotenv");
dotenv.config();
require("dotenv").config();
const fs   = require("fs");
const path = require("path");

const {OWNER_ID, GUILD_ID, AUTO_REFRESH_SECONDS } = require("./config" || "./env");
const BOT_TOKEN = process.env.BOT_TOKEN;
const { buildStatusEmbed } = require("./statusChecker");
const { registerWelcome }  = require("./welcome");

// File to persist the live message ID across restarts
const STATE_FILE = path.join(__dirname, "live_message.json");

// ── Client ────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

// Live embed state
let liveMessage  = null;
let liveInterval = null;

// ── State persistence ─────────────────────────────────────────
function saveState(channelId, messageId) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ channelId, messageId }), "utf8");
}

function clearState() {
  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
}

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return null;
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

// ── Slash commands ────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName("status_live")
    .setDescription("Post the permanent live status embed in this channel."),

  new SlashCommandBuilder()
    .setName("status_stop")
    .setDescription("Delete the live status embed and stop updates."),
].map((c) => c.toJSON());

async function registerCommands() {
  // Extract application ID from the bot token (middle segment, base64 decoded)
  const appId = Buffer.from(BOT_TOKEN.split(".")[0], "base64").toString("utf8");
  const rest   = new REST({ version: "10" }).setToken(BOT_TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(appId, GUILD_ID), { body: commands });
    console.log("[STATUS BOT] Slash commands registered.");
  } catch (err) {
    console.error("[STATUS BOT] Failed to register commands:", err);
  }
}

// ── Helpers ───────────────────────────────────────────────────
function isOwner(interaction) {
  return interaction.user.id === OWNER_ID;
}

function getGuild() {
  return client.guilds.cache.get(GUILD_ID) ?? null;
}

// ── Live refresh loop ─────────────────────────────────────────
function startLiveRefresh() {
  stopLiveRefresh();

  liveInterval = setInterval(async () => {
    if (!liveMessage) return stopLiveRefresh();

    const guild = getGuild();
    if (!guild) return;

    try {
      await liveMessage.edit({ embeds: [buildStatusEmbed(guild)] });
    } catch (err) {
      if (err.code === 10008) {
        // Message was deleted externally
        console.log("[STATUS BOT] Live message was deleted, clearing state.");
        stopLiveRefresh();
        liveMessage = null;
        clearState();
      } else {
        console.error("[STATUS BOT] Refresh error:", err.message);
      }
    }
  }, AUTO_REFRESH_SECONDS * 1000);
}

function stopLiveRefresh() {
  if (liveInterval) {
    clearInterval(liveInterval);
    liveInterval = null;
  }
}

// ── Restore live message on restart ──────────────────────────
async function restoreLiveMessage() {
  const state = loadState();
  if (!state) return;

  try {
    const channel = await client.channels.fetch(state.channelId);
    if (!channel) return;

    liveMessage = await channel.messages.fetch(state.messageId);
    console.log(`[STATUS BOT] Restored live message (ID: ${state.messageId})`);

    // Edit immediately so it's up to date after restart
    const guild = getGuild();
    if (guild) await liveMessage.edit({ embeds: [buildStatusEmbed(guild)] });

    startLiveRefresh();
  } catch (err) {
    console.log("[STATUS BOT] Could not restore live message, clearing state.");
    clearState();
  }
}

// ── Ready ─────────────────────────────────────────────────────
client.once("clientReady", async () => {
  console.log(`[STATUS BOT] Logged in as ${client.user.tag}`);
  await client.user.setActivity("Watching over Shiro's Bot's", { type: 3 });
  await restoreLiveMessage();
  registerWelcome(client);
});

// ── Interactions ──────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (!isOwner(interaction)) {
    await interaction.reply({
      content: "🚫 You are not authorised to use this command.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guild = getGuild();

  // ── /status_live ───────────────────────────────────────────
  if (interaction.commandName === "status_live") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!guild) {
      await interaction.editReply("❌ Could not find the configured guild.");
      return;
    }

    // Delete old live message if one exists
    if (liveMessage) {
      try { await liveMessage.delete(); } catch {}
      stopLiveRefresh();
      liveMessage = null;
      clearState();
    }

    const embed = buildStatusEmbed(guild);
    liveMessage  = await interaction.channel.send({ embeds: [embed] });

    saveState(interaction.channelId, liveMessage.id);
    startLiveRefresh();

    await interaction.editReply(
      `✅ Live status embed is now active in <#${interaction.channelId}>.\nIt updates every **${AUTO_REFRESH_SECONDS}s** and will persist across restarts.`
    );
  }

  // ── /status_stop ───────────────────────────────────────────
  else if (interaction.commandName === "status_stop") {
    if (!liveMessage) {
      await interaction.reply({
        content: "ℹ️ No live status embed is currently active.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    stopLiveRefresh();
    try { await liveMessage.delete(); } catch {}
    liveMessage = null;
    clearState();

    await interaction.reply({
      content: "⏹️ Live status embed deleted and updates stopped.",
      flags: MessageFlags.Ephemeral,
    });
  }
});

// ── Error handling ────────────────────────────────────────────
client.on("error", (err) => console.error("[STATUS BOT] Client error:", err));
process.on("unhandledRejection", (err) => console.error("[STATUS BOT] Unhandled rejection:", err));

// ── Login ─────────────────────────────────────────────────────
// Register commands first (needs the token, not the client), then log in
registerCommands().then(() => client.login(BOT_TOKEN));
