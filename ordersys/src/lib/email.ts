import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface OrderCompletionEmailData {
  orderId: string;
  completionDate: string;
  viewLink: string;
  sellerEmail: string;
  sellerName?: string;
}

export async function sendOrderCompletionNotification(data: OrderCompletionEmailData) {
  const { orderId, completionDate, viewLink, sellerEmail, sellerName } = data;

  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: sellerEmail,
    subject: `💰 Order ${orderId} är klar för fakturering`,
    html: `
      <!DOCTYPE html>
      <html lang="sv">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Klar för Fakturering</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #f4f6f8;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #334155;
          }
          .container {
            max-width: 640px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.08);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #ffffff;
            text-align: center;
            padding: 50px 20px 40px 20px;
          }
          .header h1 {
            margin: 10px 0 0;
            font-size: 28px;
            font-weight: 700;
          }
          .header p {
            margin: 5px 0 0;
            color: #000000;
            font-weight: 600;
          }
          .content {
            padding: 40px 32px;
          }
          .content p {
            font-size: 16px;
            line-height: 1.7;
            margin-bottom: 20px;
          }
          .order-card {
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border: 1.5px solid #86efac;
            border-radius: 12px;
            padding: 24px;
            margin: 35px 0;
          }
          .order-card h2 {
            color: #166534;
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 16px;
          }
          .order-info {
            width: 100%;
            border-collapse: collapse;
          }
          .order-info td {
            padding: 8px 0;
            vertical-align: top;
          }
          .label {
            color: #166534;
            font-weight: 600;
            width: 150px;
          }
          .value {
            color: #14532d;
            font-weight: 500;
          }
          .status-pill {
            display: inline-block;
            background-color: #22c55e;
            color: #ffffff;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
          }
          .cta {
            text-align: center;
            margin: 40px 0;
          }
          .cta a {
            background-color: #ffffff;
            border: 2px solid #10b981;
            color: #000000;
            text-decoration: none;
            padding: 16px 36px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 16px;
            display: inline-block;
            box-shadow: 0 4px 14px rgba(16,185,129,0.25);
            transition: all 0.25s ease;
          }
          .cta a:hover {
            background-color: #10b981;
            color: #ffffff;
            transform: translateY(-2px);
            box-shadow: 0 8px 22px rgba(16,185,129,0.35);
          }
          .next-steps {
            background-color: #fff7ed;
            border-left: 4px solid #f59e0b;
            padding: 20px;
            border-radius: 0 10px 10px 0;
            margin: 30px 0;
          }
          .next-steps h3 {
            color: #92400e;
            margin: 0 0 8px 0;
            font-size: 16px;
          }
          .next-steps li {
            color: #78350f;
            margin-bottom: 6px;
          }
          .stats {
            background-color: #f8fafc;
            border-radius: 12px;
            padding: 18px 0;
            display: flex;
            justify-content: space-around;
            text-align: center;
            margin: 35px 0;
          }
          .stats div {
            flex: 1;
          }
          .stats-icon {
            font-size: 26px;
            font-weight: 700;
            color: #10b981;
          }
          .stats-label {
            font-size: 12px;
            color: #64748b;
            margin-top: 5px;
          }
          .footer {
            background-color: #f9fafb;
            border-top: 1px solid #e2e8f0;
            padding: 30px;
            text-align: center;
            font-size: 14px;
            color: #64748b;
          }
          .footer small {
            display: block;
            color: #94a3b8;
            font-size: 12px;
            margin-top: 16px;
          }
          @media (max-width: 600px) {
            .content {
              padding: 28px 20px;
            }
            .cta a {
              width: 100%;
              box-sizing: border-box;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 52px;">💰</div>
            <h1>Klar för Fakturering!</h1>
            <p>Din order har slutförts och kan nu faktureras</p>
          </div>

          <div class="content">
            <p>Hej ${sellerName || 'Säljare'},</p>
            <p>
              Goda nyheter! Din order har nu <strong>slutförts i alla spår</strong> och är redo att faktureras.
              Alla arbetsmoment är avslutade och projektet kan nu avslutas ekonomiskt.
            </p>

            <div class="order-card">
              <h2>📋 Orderinformation</h2>
              <table class="order-info">
                <tr>
                  <td class="label">Ordernummer:</td>
                  <td class="value">#${orderId}</td>
                </tr>
                <tr>
                  <td class="label">Slutförd datum:</td>
                  <td class="value">${completionDate}</td>
                </tr>
                <tr>
                  <td class="label">Status:</td>
                  <td class="value"><span class="status-pill">✅ Alla spår avslutade</span></td>
                </tr>
              </table>
            </div>

            <div class="cta">
              <a href="${viewLink}">💼 Gå till Fakturering</a>
            </div>

            <div class="next-steps">
              <h3>⚡ Nästa steg</h3>
              <ul>
                <li><strong>Granska ordern</strong> och bekräfta att allt är korrekt</li>
                <li><strong>Skapa faktura</strong> i systemet eller via Fortnox</li>
                <li><strong>Skicka faktura</strong> till kunden</li>
              </ul>
            </div>

            <div class="stats">
              <div>
                <div class="stats-icon">✓</div>
                <div class="stats-label">Alla spår<br>slutförda</div>
              </div>
              <div>
                <div class="stats-icon">💼</div>
                <div class="stats-label">Redo för<br>fakturering</div>
              </div>
              <div>
                <div class="stats-icon">📧</div>
                <div class="stats-label">Kund kan<br>meddelas</div>
              </div>
            </div>

            <p>
              Ordern är nu markerad som slutförd i alla produktionsspår (A, B, C, D).<br>
              Du kan nu gå vidare med faktureringen och avsluta projektet ekonomiskt.
            </p>

            <p>
              Med vänliga hälsningar,<br>
              <strong>Ordina Orderhanteringssystem</strong>
            </p>
          </div>

          <div class="footer">
            Detta är en automatisk notifiering från Ordina Orderhanteringssystem.<br>
            Ordern är nu redo för fakturering och ekonomisk avslutning.
            <small>© ${new Date().getFullYear()} Ordina AB | Orderhanteringssystem</small>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Order completion email sent to ${sellerEmail} for order ${orderId}`);
  } catch (error) {
    console.error('Failed to send order completion email:', error);
    throw error;
  }
}
