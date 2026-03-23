// ============================================================
//  welcome.js — Sends a DM to every new member who joins
// ============================================================

const { EmbedBuilder } = require("discord.js");

const WELCOME_COLOR  = 0x5865f2;
const WELCOME_GUILD  = "1425196013127209022";

/**
 * Build the DM embed sent to the new member.
 */
function buildWelcomeDM(member) {
  const username  = member.user.username;
  const servName  = member.guild.name;
  const memberNum = member.guild.memberCount;
  const avatarURL = member.user.displayAvatarURL({ size: 256 });

  return new EmbedBuilder()
    .setColor(WELCOME_COLOR)
    .setTitle(`👋  Welcome to ${servName}, ${username}!`)
    .setThumbnail(avatarURL)
    .setDescription(
      `Hey **${username}** — we're really glad to have you here! 🎉\n\n` +
      `You're our **#${memberNum}** member. Make yourself at home.\n\n` +
      `> If you have any questions, feel free to ask in the server.\n` +
      `> We hope you enjoy your stay! 😊`
    )
    .addFields(
      { name: "🏠  Server", value: servName,                              inline: true },
      { name: "📅  Joined", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
    )
    .setFooter({ text: `${servName} · Welcome aboard` })
    .setTimestamp();
}

/**
 * Attach the guildMemberAdd listener to the client.
 */
function registerWelcome(client) {

  // ── Raw event debug — fires for ALL guilds, tells us if Discord
  //    is even sending the event to the bot at all
  client.on("raw", (packet) => {
    if (packet.t === "GUILD_MEMBER_ADD") {
      console.log(`[WELCOME DEBUG] GUILD_MEMBER_ADD raw event received:`, JSON.stringify(packet.d).slice(0, 200));
    }
  });

  client.on("guildMemberAdd", async (member) => {
    console.log(`[WELCOME DEBUG] guildMemberAdd fired — guild: ${member.guild.id}, user: ${member.user.username}`);

    // Only handle the specific guild
    if (member.guild.id !== WELCOME_GUILD) {
      console.log(`[WELCOME DEBUG] Ignoring — wrong guild (${member.guild.id})`);
      return;
    }

    // Ignore bots
    if (member.user.bot) {
      console.log(`[WELCOME DEBUG] Ignoring — user is a bot`);
      return;
    }

    console.log(`[WELCOME] New member joined: ${member.user.username} in ${member.guild.name}`);

    try {
      const embed = buildWelcomeDM(member);
      await member.send({ embeds: [embed] });
      console.log(`[WELCOME] ✅ DM sent to ${member.user.username}`);
    } catch (err) {
      if (err.code === 50007) {
        console.log(`[WELCOME] ❌ Could not DM ${member.user.username} — DMs are disabled.`);
      } else {
        console.error(`[WELCOME] ❌ Failed to DM ${member.user.username}:`, err.code, err.message);
      }
    }
  });

  console.log("[WELCOME] Welcome DM handler registered.");
}

module.exports = { registerWelcome };