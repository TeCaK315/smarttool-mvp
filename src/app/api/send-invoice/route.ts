import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { to, invoiceData } = await request.json();

    if (!to || !invoiceData) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные поля' },
        { status: 400 }
      );
    }

    const itemsHtml = invoiceData.items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">₽${item.rate.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">₽${item.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Счет ${invoiceData.invoiceNumber}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background: #5a67d8; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Счет ${invoiceData.invoiceNumber}</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              <div>
                <h3 style="margin: 0 0 10px 0; color: #5a67d8;">Информация о счете</h3>
                <p style="margin: 5px 0;"><strong>Номер:</strong> ${invoiceData.invoiceNumber}</p>
                <p style="margin: 5px 0;"><strong>Дата:</strong> ${new Date(invoiceData.date).toLocaleDateString('ru-RU')}</p>
                <p style="margin: 5px 0;"><strong>Срок оплаты:</strong> ${new Date(invoiceData.dueDate).toLocaleDateString('ru-RU')}</p>
              </div>
              <div>
                <h3 style="margin: 0 0 10px 0; color: #5a67d8;">Клиент</h3>
                <p style="margin: 5px 0;"><strong>${invoiceData.client.name}</strong></p>
                <p style="margin: 5px 0;">${invoiceData.client.email}</p>
                <p style="margin: 5px 0;">${invoiceData.client.address}</p>
                ${invoiceData.client.phone ? `<p style="margin: 5px 0;">${invoiceData.client.phone}</p>` : ''}
              </div>
            </div>
            
            <h3 style="color: #5a67d8; margin: 20px 0 10px 0;">Позиции</h3>
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 4px; overflow: hidden;">
              <thead>
                <tr style="background: #5a67d8; color: white;">
                  <th style="padding: 12px 8px; text-align: left;">Описание</th>
                  <th style="padding: 12px 8px; text-align: center;">Кол-во</th>
                  <th style="padding: 12px 8px; text-align: right;">Цена</th>
                  <th style="padding: 12px 8px; text-align: right;">Сумма</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="margin-top: 20px; text-align: right;">
              <div style="background: white; padding: 15px; border-radius: 4px; display: inline-block; min-width: 200px;">
                <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Подытог:</span> <span>₽${invoiceData.subtotal.toFixed(2)}</span></p>
                <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Налог (10%):</span> <span>₽${invoiceData.tax.toFixed(2)}</span></p>
                <hr style="margin: 10px 0; border: none; border-top: 1px solid #e2e8f0;">
                <p style="margin: 5px 0; font-weight: bold; font-size: 18px; display: flex; justify-content: space-between;"><span>Итого:</span> <span>₽${invoiceData.total.toFixed(2)}</span></p>
              </div>
            </div>
            
            ${invoiceData.notes ? `
              <div style="margin-top: 20px;">
                <h3 style="color: #5a67d8; margin: 0 0 10px 0;">Примечания</h3>
                <p style="background: white; padding: 15px; border-radius: 4px; margin: 0;">${invoiceData.notes}</p>
              </div>
            ` : ''}
          </div>
          
          <div style="background: #e2e8f0; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">Спасибо за ваш бизнес!</p>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: 'SmartTool <noreply@smarttool.com>',
      to: [to],
      subject: `Счет ${invoiceData.invoiceNumber}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Ошибка отправки email:', error);
      return NextResponse.json(
        { error: 'Ошибка отправки email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Ошибка API:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}