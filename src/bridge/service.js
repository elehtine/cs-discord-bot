let discordClient;
let telegramClient;

const validDiscordChannel = async (courseName) => {
  const guild = await discordClient.guilds.fetch(process.env.GUILD_ID);
  courseName = courseName.replace(/ /g, "-");
  const channel = guild.channels.cache.find(
    c => c.name === `${courseName}_general`,
  );
  return channel;
};

// Create user
const createDiscordUser = async (ctx) => {
  const username = ctx.message.from.first_name || ctx.message.from.username;
  let url;
  const t = await telegramClient.telegram.getUserProfilePhotos(ctx.message.from.id);
  if (t.photos.length) url = await telegramClient.telegram.getFileLink(t.photos[0][0].file_id);
  const user = { username: username, avatarUrl: url };
  return user;
};


// Send message methods
const sendMessageToDiscord = async (message, channel) => {
  try {
    const webhooks = await channel.fetchWebhooks();
    const webhook = webhooks.first();

    if (message.content.text) {
      await webhook.send({
        content: message.content.text,
        username: message.user.username,
        avatarURL: message.user.avatarUrl,
      });
    }

    if (message.content.photo) {
      await webhook.send({
        content: message.content.photo.caption,
        username: message.user.username,
        avatarURL: message.user.avatarUrl,
        files: [message.content.photo.url],
      });
    }
  }
  catch (error) {
    console.error("Error trying to send a message: ", error);
  }
};

const handleBridgeMessage = async (message, courseName, Course) => {
  if (!message.channel.parent) return;
  // const channelName = message.channel.name;

  const group = await Course.findOne({ where: { name: String(courseName) } });

  if (!group) {
    return;
  }
  if (message.author.bot) return;

  const sender = message.member.nickname || message.author.username;

  /* let channel = "";
  const name = courseName.replace(/ /g, "-");
  channel = channelName === `${name}_announcement` ? " announcement" : channel;
  channel = channelName === `${name}_general` ? " general" : channel;*/

  let msg;
  if (message.content.includes("<@!")) {
    const userID = message.content.match(/(?<=<@!).*?(?=>)/)[0];
    let user = message.guild.members.cache.get(userID);
    user ? user = user.user.username : user = "Jon Doe";
    msg = message.content.replace(/<.*>/, `${user}`);
  }
  else {
    msg = message.content;
  }

  // Handle content correctly
  const photo = message.attachments.first();
  const gif = message.embeds[0];
  if (photo) {
    await sendPhotoToTelegram(group.telegramId, msg, sender, photo.url);
  }
  else if (gif) {
    await sendAnimationToTelegram(group.telegramId, sender, gif.video.url);
  }
  else {
    await sendMessageToTelegram(group.telegramId, msg, sender);
  }
};

const escapeChars = (content) => {
  return content
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/~/g, "\\~")
    .replace(/`/g, "\\`")
    .replace(/>/g, "\\>")
    .replace(/#/g, "\\#")
    .replace(/\+/g, "\\+")
    .replace(/-/g, "\\-")
    .replace(/=/g, "\\=")
    .replace(/\|/g, "\\|")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\./g, "\\.")
    .replace(/!/g, "\\!");
};

const validateContent = (content) => {
  const regexp = /^`((.|\n)*)`$/;
  if (!regexp.test(content)) content = escapeChars(content);
  return content;
};

const sendMessageToTelegram = async (telegramId, content, sender) => {
  sender = escapeChars(sender);
  content = validateContent(content);
  sender ?
    await telegramClient.telegram.sendMessage(telegramId, `*${sender}:*\n ${content}`, { parse_mode: "MarkdownV2" }) :
    await telegramClient.telegram.sendMessage(telegramId, `${content}`, { parse_mode: "MarkdownV2" });
};

const sendPhotoToTelegram = async (telegramId, info, sender, url) => {
  sender = escapeChars(sender);
  info = validateContent(info);
  const caption = `*${sender}:* ${info}`;
  await telegramClient.telegram.sendPhoto(telegramId, { url }, { caption, parse_mode: "MarkdownV2" });
};

const sendAnimationToTelegram = async (telegramId, sender, url) => {
  sender = escapeChars(sender);
  const caption = `*${sender}*`;
  await telegramClient.telegram.sendAnimation(telegramId, { url }, { caption, parse_mode: "MarkdownV2" });
};

const getCourseName = (categoryName) => {
  let cleaned = null;
  if (categoryName.includes("📚")) {
    cleaned = categoryName.replace("📚", "").trim();
  }
  else {
    cleaned = categoryName.replace("🔒", "").trim();
  }
  const regExp = /\(([^)]+)\)/;
  const matches = regExp.exec(cleaned);
  return matches?.[1] || cleaned;
};

const initService = (dclient, tClient) => {
  discordClient = dclient;
  telegramClient = tClient;
};

module.exports = {
  initService,
  validDiscordChannel,
  createDiscordUser,
  sendMessageToDiscord,
  sendMessageToTelegram,
  sendPhotoToTelegram,
  sendAnimationToTelegram,
  handleBridgeMessage,
  getCourseName,
};