import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase/client';
import { UserRepository } from '../../../repositories/userRepository';
import { AccountRepository } from '../../../repositories/accountRepository';
import { TransactionRepository } from '../../../repositories/transactionRepository';
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
          const accounts = await AccountRepository.findByUserId(user.id);
          if (accounts.length === 0) {
            await sendTelegramMessage(chat.id, "You don't have any accounts set up yet. Use /addaccount to create one.");
          } else {
            const accList = accounts.map(a => `💳 **${a.name}** (${a.type}): $${a.balance}`).join('\n');
            await sendTelegramMessage(chat.id, `🏦 **Your Accounts:**\n\n${accList}`);
          }
          break;
        case '/today':
          const recentTx = await TransactionRepository.getRecentByUserId(user.id, 5);
          if (recentTx.length === 0) {
            await sendTelegramMessage(chat.id, "No recent transactions found for today.");
          } else {
            const txList = recentTx.map(t => {
              const emoji = t.type === 'Income' ? '✅' : '💸';
              return `${emoji} $${t.amount} - ${t.description || t.type}`;
            }).join('\n');
            await sendTelegramMessage(chat.id, `📅 **Recent Transactions:**\n\n${txList}`);
          }
          break;
        case '/addaccount':
          const args = text.split(' ').slice(1);
          if (args.length < 2) {
            await sendTelegramMessage(chat.id, "Usage: /addaccount <Name> <Type> [Balance]\nExample: /addaccount HDFC Bank 5000");
          } else {
            const [name, type, balance] = args;
            await AccountRepository.create({
              user_id: user.id,
              name,
              type,
              balance: balance ? parseFloat(balance) : 0,
              is_default: false
            });
            await sendTelegramMessage(chat.id, `✅ Account **${name}** added successfully!`);
          }
          break;
        case '/deleteaccount':
          const delArgs = text.split(' ').slice(1);
          if (delArgs.length < 1) {
             await sendTelegramMessage(chat.id, "Usage: /deleteaccount <Name>");
          } else {
             const name = delArgs.join(' ');
             const { error } = await supabase.from('accounts').delete().match({ user_id: user.id, name });
             if (error) {
                 await sendTelegramMessage(chat.id, `Failed to delete: ${error.message}`);
             } else {
                 await sendTelegramMessage(chat.id, `🗑️ Account **${name}** deleted.`);
             }
          }
          break;
        case '/income':
        case '/expense':
           const txArgs = text.split(' ').slice(1);
           if(txArgs.length < 2) {
             await sendTelegramMessage(chat.id, `Usage: ${command} <Amount> <Category> [Description]\nExample: ${command} 500 Food Lunch`);
           } else {
             const amount = parseFloat(txArgs[0]);
             const catName = txArgs[1];
             const desc = txArgs.slice(2).join(' ');
             const type = command === '/income' ? 'Income' : 'Expense';
             
             let { data: cat } = await supabase.from('categories').select('id').match({ user_id: user.id, name: catName, type }).single();
             if (!cat) {
                const { data: newCat } = await supabase.from('categories').insert({ user_id: user.id, name: catName, type }).select().single();
                cat = newCat;
             }
             
             await TransactionRepository.create({
                 user_id: user.id,
                 category_id: cat?.id,
                 type,
                 amount,
                 description: desc || catName
             });
             const emoji = type === 'Income' ? '✅' : '💸';
             await sendTelegramMessage(chat.id, `${emoji} Logged ${type}: $${amount} for ${catName}`);
           }
           break;
        case '/transfer':
           await sendTelegramMessage(chat.id, "Transfer command requires amount, from_account, and to_account. E.g. Transfer 500 from Cash to Bank (Use natural language instead!)");
           break;
        case '/report':
        case '/week':
        case '/month':
        case '/year':
           let days = 30;
           if(command === '/week') days = 7;
           if(command === '/year') days = 365;
           
           const dateLimit = new Date();
           dateLimit.setDate(dateLimit.getDate() - days);
           
           const { data: txs } = await supabase.from('transactions').select('amount, type').eq('user_id', user.id).gte('transaction_date', dateLimit.toISOString());
           
           let totalInc = 0; let totalExp = 0;
           (txs || []).forEach(t => { if(t.type === 'Income') totalInc += Number(t.amount); else if (t.type === 'Expense') totalExp += Number(t.amount); });
           
           await sendTelegramMessage(chat.id, `📊 **Report (${command.replace('/','')}):**\nIncome: $${totalInc.toFixed(2)}\nExpense: $${totalExp.toFixed(2)}\nNet: $${(totalInc - totalExp).toFixed(2)}`);
           break;
        case '/budget':
        case '/goals':
        case '/categories':
           const table = command.replace('/', '');
           const { data: items } = await supabase.from(table).select('*').eq('user_id', user.id).limit(10);
           if (!items || items.length === 0) {
              await sendTelegramMessage(chat.id, `You have no ${table} set up yet.`);
           } else {
              const list = items.map(i => `• ${i.name || i.title || 'Item'}`).join('\n');
              await sendTelegramMessage(chat.id, `📋 **Your ${table}:**\n${list}`);
           }
           break;
        case '/export':
           await sendTelegramMessage(chat.id, "Your data has been compiled. You can download your CSV from the web dashboard.");
           break;
        case '/import':
           await sendTelegramMessage(chat.id, "To import data, please log in to the web dashboard and upload your CSV file.");
           break;
        case '/settings':
           await sendTelegramMessage(chat.id, "⚙️ **Settings**\n- Currency: USD\n- Timezone: UTC\n- Language: English\n\n(Settings can be changed in the web dashboard)");
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
