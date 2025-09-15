const { Telegraf, Markup } = require('telegraf');
const { makeTable } = require('./utils');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

function mainMenu(ctx, replace = false) {
  const title = `👋你好，${ctx.from.first_name} \n\n 🤖欢迎使用Temporam Console`;
  const extra = Markup.inlineKeyboard([
    [Markup.button.callback('每日邮件汇报', 'today_report')],
    [Markup.button.callback('近7日邮件汇总', 'week_report')],
    [Markup.button.callback('数据库用量统计', 'db_report')],
    [Markup.button.callback('删除历史邮件', 'delete_email')],
    [Markup.button.callback('检查服务状态', 'check_status')],
  ]);
  if (replace) {
    ctx.editMessageText(title, extra);
  } else {
    ctx.reply(title, extra);
  }
}

bot.use(async (ctx, next) => {
  if (ctx.from && ctx.from.id.toString() === process.env.ADMIN_ID) {
    return next();
  } else {
    await ctx.reply('Forbidden!');
  }
});

bot.start((ctx) => {
  mainMenu(ctx);
});

bot.action('today_report', async (ctx) => {
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

    const title = '今日实时数据汇总\n\n';

    const table = makeTable([
      ['Metric', 'Value'],
      ...data.map((row) => [row.metric, row.value]),
    ]);

    const text = title + table;

    await ctx.telegram.editMessageText(ctx.chat.id, mid, null, text, {
      parse_mode: 'HTML',
    });
  } catch (e) {
    await ctx.telegram.editMessageText(ctx.chat.id, mid, null, e.message);
  }
});

bot.action('week_report', async (ctx) => {
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

    const title = '近7日邮件汇总\n\n';

    const table = makeTable([
      ['Date', 'Total', 'MOM'],
      ...data.map((row) => [row.day, row.total, row.mom]),
    ]);

    const text = title + table;

    await ctx.telegram.editMessageText(ctx.chat.id, mid, null, text, {
      parse_mode: 'HTML',
    });
  } catch (e) {
    await ctx.telegram.editMessageText(ctx.chat.id, mid, null, e.message);
  }
});

bot.action('db_report', async (ctx) => {
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

    const title = `数据库用量统计\n\n`;

    const table = makeTable([
      ['Name', 'Size'],
      ...data.map((item) => [item.datname, item.size]),
    ]);

    const text = title + table;

    await ctx.telegram.editMessageText(ctx.chat.id, mid, null, text, {
      parse_mode: 'HTML',
    });
  } catch (e) {
    await ctx.telegram.editMessageText(ctx.chat.id, mid, null, e.message);
  }
});

bot.action('delete_email', async (ctx) => {
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
  mainMenu(ctx, true);
});

bot.action('check_status', async (ctx) => {
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

// 捕获任何其他文本消息，只对管理员可见
bot.on('text', (ctx) => {
  ctx.reply('请使用/start命令开始');
});

// --- 启动 Bot ---
// 长轮询，适合主机托管
// bot.launch();

// webhook，适合无服务托管
module.exports = bot.webhookCallback('/');

// 确保程序在接收到终止信号时能优雅地退出，仅长轮询模式
// process.once('SIGINT', () => bot.stop('SIGINT'));
// process.once('SIGTERM', () => bot.stop('SIGTERM'));
