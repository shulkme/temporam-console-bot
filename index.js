const { Telegraf, Markup } = require('telegraf');
const { makeTable } = require('./utils');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const isDev = process.env.NODE_ENV !== 'production';

console.log('NODE_ENV:', process.env.NODE_ENV);

if (!isDev) {
  bot.telegram.setWebhook(process.env.WEBHOOK_URL);
}

bot.use(async (ctx, next) => {
  if (ctx.from && ctx.from.id.toString() === process.env.ADMIN_ID) {
    return next();
  } else {
    await ctx.reply('Forbidden!');
  }
});

bot.start((ctx) => {
  ctx.reply(
    `👋Hi，${ctx.from.first_name} \n\n🤖 欢迎使用 Temporam Console Bot \n\n🪄 输入 /start 开始`,
    Markup.keyboard([
      ['🎉 每日邮件汇报'],
      ['📊 近7日邮件汇总'],
      ['💾 数据库用量统计'],
      ['🗑️ 删除历史邮件'],
      ['✅ 检查服务状态'],
    ]),
    {
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  );
});

bot.hears('🎉 每日邮件汇报', async (ctx) => {
  const msg = await ctx.reply('正在生成统计数据...');
  const mid = msg.message_id;

  try {
    const result = await fetch(
      `${process.env.API_BASE_URL}/console/report/today`,
      {
        headers: {
          'x-internal-auth': process.env.API_SECRET,
        },
      },
    );
    if (!result.ok) {
      throw new Error(result.status.toString());
    }

    const data = await result.json();

    const table = makeTable([
      ['Metric', 'Value'],
      ...data.map((row) => [row.metric, row.value]),
    ]);

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      mid,
      null,
      '今日实时数据汇总',
      {
        reply_markup: {
          inline_keyboard: table,
        },
      },
    );
  } catch (e) {
    await ctx.telegram.editMessageText(ctx.chat.id, mid, null, e.message);
  }
});

bot.hears('📊 近7日邮件汇总', async (ctx) => {
  const msg = await ctx.reply('正在生成统计数据...');
  const mid = msg.message_id;

  try {
    const result = await fetch(
      `${process.env.API_BASE_URL}/console/report/week`,
      {
        headers: {
          'x-internal-auth': process.env.API_SECRET,
        },
      },
    );
    if (!result.ok) {
      throw new Error(result.status.toString());
    }

    const data = await result.json();

    const table = makeTable([
      ['Date', 'Total', 'MOM'],
      ...data.map((row) => [row.day, row.total, row.mom]),
    ]);

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      mid,
      null,
      '近7日邮件汇总',
      {
        reply_markup: {
          inline_keyboard: table,
        },
      },
    );
  } catch (e) {
    await ctx.telegram.editMessageText(ctx.chat.id, mid, null, e.message);
  }
});

bot.hears('💾 数据库用量统计', async (ctx) => {
  const msg = await ctx.reply('正在生成统计数据...');
  const mid = msg.message_id;

  try {
    const result = await fetch(
      `${process.env.API_BASE_URL}/console/report/db`,
      {
        headers: {
          'x-internal-auth': process.env.API_SECRET,
        },
      },
    );
    if (!result.ok) {
      throw new Error(result.status.toString());
    }

    const data = await result.json();

    const table = makeTable([
      ['Name', 'Size'],
      ...data.map((item) => [item.datname, item.size]),
    ]);

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      mid,
      null,
      '数据库用量统计',
      {
        reply_markup: {
          inline_keyboard: table,
        },
      },
    );
  } catch (e) {
    await ctx.telegram.editMessageText(ctx.chat.id, mid, null, e.message);
  }
});

bot.hears('🗑️ 删除历史邮件', async (ctx) => {
  await ctx.reply(
    '⚠️确定要删除历史数据吗？',
    Markup.inlineKeyboard([
      [Markup.button.callback('确定', 'complete_delete_email')],
      [Markup.button.callback('取消', 'main_menu')],
    ]),
  );
});

bot.action('complete_delete_email', async (ctx) => {
  const msg = await ctx.editMessageText('正在删除历史数据...');
  const mid = msg.message_id;
  try {
    const result = await fetch(
      `${process.env.API_BASE_URL}/console/email/clear`,
      {
        headers: {
          'x-internal-auth': process.env.API_SECRET,
        },
      },
    );
    if (!result.ok) {
      throw new Error(result.status.toString());
    }
    await ctx.telegram.editMessageText(ctx.chat.id, mid, null, '删除成功！');
  } catch (e) {
    await ctx.telegram.editMessageText(ctx.chat.id, mid, null, e.message);
  }
});
bot.action('main_menu', (ctx) => {
  ctx.deleteMessage();
});

bot.hears('✅ 检查服务状态', async (ctx) => {
  const msg = await ctx.reply('正在检查服务状态...');
  const mid = msg.message_id;
  try {
    const result = await fetch(
      `${process.env.API_BASE_URL}/console/status/check`,
      {
        headers: {
          'x-internal-auth': process.env.API_SECRET,
        },
      },
    );
    if (!result.ok) {
      throw new Error('🆘服务不可用');
    }
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      mid,
      null,
      '✅服务运行正常',
    );
  } catch (e) {
    await ctx.telegram.editMessageText(ctx.chat.id, mid, null, e.message);
  }
});

bot.action('noop', (ctx) => ctx.answerCbQuery());

// --- 启动 Bot ---
if (isDev) {
  // 长轮询，适合主机托管
  bot.launch();
  // 确保程序在接收到终止信号时能优雅地退出，仅长轮询模式
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
} else {
  // webhook，适合无服务托管
  module.exports = bot.webhookCallback('/');
}
