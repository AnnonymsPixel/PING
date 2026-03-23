# Discord Status Bot (JS)

Monitors and displays the online/offline status of your bots via slash commands.

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create your bot on Discord
1. Go to https://discord.com/developers/applications → **New Application**
2. Go to **Bot** tab → **Add Bot** → copy the **Token**
3. Under **Privileged Gateway Intents**, enable:
   - ✅ **PRESENCE INTENT** ← required to see online/offline/idle/dnd
   - ✅ **SERVER MEMBERS INTENT** ← required to fetch member data

### 3. Fill in config.js
| Field | How to get it |
|---|---|
| `OWNER_ID` | Enable Developer Mode → right-click yourself → Copy User ID |
| `BOT_TOKEN` | Developer Portal → your app → Bot → Reset Token |
| `MONITORED_BOTS` | Right-click each bot in your server → Copy User ID |
| `GUILD_ID` | Right-click your server icon → Copy Server ID |

> All IDs must be strings (wrapped in quotes) in the JS version.

### 4. Invite the bot
Generate an OAuth2 URL with scopes: `bot` + `applications.commands`

Permissions needed:
- View Channels
- Send Messages
- Embed Links

### 5. Run
```bash
npm start
# or
node bot.js
```

---

## Commands (only you can use these)

| Command | What it does |
|---|---|
| `/status` | Private embed showing all monitored bots |
| `/status_single <bot_name>` | Detailed view of one specific bot |
| `/status_live` | Posts a public auto-updating embed in the channel |
| `/status_stop` | Stops the live embed updates |

---

## File Structure

```
discord-status-bot-js/
├── bot.js             # Entry point — client, commands, interaction handler
├── statusChecker.js   # Presence logic & embed builders (extend here later)
├── config.js          # All your tokens, IDs, and settings
├── package.json
└── README.md
```

---

## Adding Server Online/Offline Status Later

In `statusChecker.js`, add:

```js
const net = require("net");

function checkServerPort(host, port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.connect(port, host, () => { socket.destroy(); resolve(true); });
    socket.on("error",   () => { socket.destroy(); resolve(false); });
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
  });
}
```

Then add a `/server_status` command in `bot.js` that calls it and builds an embed.
