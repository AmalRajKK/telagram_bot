import { NextResponse } from 'next/server';
import { UserRepository } from '../../../repositories/userRepository';
import { parseTransactionMessage } from '../../../lib/ai/parser';
import { TransactionService } from '../../../services/transactionService';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(request: Request) {
  try {
    const update = await request.json();

    if (!update.message || !update.message.text) {
      return NextResponse.json({ status: 'ignored' });
    }

    const { text, from, chat } = update.message;
    const telegramId = from.id;

    // 1. Authenticate / Create User
    let user = await UserRepository.findByTelegramId(telegramId);
    if (!user) {
      user = await UserRepository.create({
        telegram_id: telegramId,
        username: from.username,
        first_name: from.first_name,
        last_name: from.last_name,
      });
      await sendTelegramMessage(chat.id, `Welcome ${from.first_name}! Your finance account has been set up. Tell me your expenses like: "Spent 250 on coffee".`);
      return NextResponse.json({ status: 'ok' });
    }

    // Handle commands
    if (text.startsWith('/')) {
      const command = text.split(' ')[0].toLowerCase();

      switch (command) {
        case '/start':
          await sendTelegramMessage(chat.id, `Welcome back ${from.first_name}! You can tell me your expenses like: "Bought lunch for 15" or use the menu for more options.`);
          break;
        case '/help':
          await sendTelegramMessage(chat.id, `🤖 **Finance Bot Help**\n\nYou can talk to me naturally!\nExamples:\n- "Spent 250 for lunch"\n- "Salary 7000"\n- "Transfer 300 to Savings"\n\nUse the menu to see all available commands.`);
          break;
        case '/accounts':
        case '/addaccount':
        case '/deleteaccount':
        case '/income':
        case '/expense':
        case '/transfer':
        case '/report':
        case '/today':
        case '/week':
        case '/month':
        case '/year':
        case '/budget':
        case '/goals':
        case '/export':
        case '/import':
        case '/categories':
        case '/settings':
          await sendTelegramMessage(chat.id, `The ${command} command is recognized but the feature is currently under development! Stay tuned 🚀`);
          break;
        default:
          await sendTelegramMessage(chat.id, `Unknown command: ${command}. Type /help to see what I can do.`);
          break;
      }
      return NextResponse.json({ status: 'ok' });
    }

    // 2. Parse Message with Gemini
    const parsedData = await parseTransactionMessage(text);

    if (!parsedData) {
      await sendTelegramMessage(chat.id, "I couldn't understand that as a transaction. E.g. 'Paid rent 1200' or 'Salary 5000'.");
      return NextResponse.json({ status: 'ok' });
    }

    // 3. Process Transaction
    await TransactionService.addTransactionFromText(user.id, parsedData);

    const emoji = parsedData.type === 'Income' ? '✅' : '💸';
    await sendTelegramMessage(
      chat.id,
      `${emoji} Logged ${parsedData.type}:\nAmount: ${parsedData.amount}\nCategory: ${parsedData.category}`
    );

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
