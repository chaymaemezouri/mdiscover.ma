export type BrandVars = {
  brandName: string;
  logoUrl: string;
  siteUrl: string;
  supportEmail: string;
  year: number;
};

export type WelcomeEmailVars = BrandVars & {
  customerName: string;
};

export type OrderEmailVars = BrandVars & {
  customerName: string;
  orderNumber: string;
  orderUrl: string;
  trackingNumber?: string | null;
  carrierName?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout(opts: {
  brand: BrandVars;
  preheader: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const { brand, preheader, title, bodyHtml, ctaLabel, ctaUrl } = opts;
  const name = escapeHtml(brand.brandName);
  const logo = escapeHtml(brand.logoUrl);
  const site = escapeHtml(brand.siteUrl);
  const support = escapeHtml(brand.supportEmail);

  const cta =
    ctaLabel && ctaUrl
      ? `<tr>
          <td style="padding:28px 0 8px;">
            <a href="${escapeHtml(ctaUrl)}"
               style="display:inline-block;background:#0e2a47;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.02em;padding:14px 28px;border-radius:999px;">
              ${escapeHtml(ctaLabel)}
            </a>
          </td>
        </tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f6f9;font-family:Arial,Helvetica,sans-serif;color:#0e2a47;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid rgba(14,42,71,0.08);">
          <tr>
            <td style="padding:28px 32px 18px;border-bottom:1px solid rgba(14,42,71,0.06);">
              <img src="${logo}" alt="${name}" height="36" style="display:block;height:36px;width:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#4e7a63;">
                ${name}
              </p>
              <h1 style="margin:0;font-size:24px;line-height:1.25;letter-spacing:-0.02em;color:#0e2a47;">
                ${escapeHtml(title)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 8px;font-size:15px;line-height:1.6;color:#334155;">
              ${bodyHtml}
            </td>
          </tr>
          ${cta}
          <tr>
            <td style="padding:8px 32px 32px;font-size:15px;line-height:1.6;color:#334155;">
              <p style="margin:24px 0 0;">À bientôt,<br /><strong>L’équipe ${name}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#0e2a47;color:rgba(255,255,255,0.78);font-size:12px;line-height:1.5;">
              <p style="margin:0 0 6px;"><strong style="color:#ffffff;">${name}</strong> — Food &amp; Hygiène B2B</p>
              <p style="margin:0;">
                <a href="${site}" style="color:#9ec5b0;text-decoration:none;">${site.replace(/^https?:\/\//, '')}</a>
                ·
                <a href="mailto:${support}" style="color:#9ec5b0;text-decoration:none;">${support}</a>
              </p>
              <p style="margin:10px 0 0;opacity:0.7;">© ${brand.year} ${name}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function greeting(name: string) {
  return `Bonjour <strong>${escapeHtml(name)}</strong>,`;
}

export function welcomeEmail(vars: WelcomeEmailVars) {
  const title = 'Bienvenue chez MDiscover';
  const html = layout({
    brand: vars,
    preheader: 'Votre compte MDiscover est prêt.',
    title,
    bodyHtml: `
      <p style="margin:0 0 14px;">${greeting(vars.customerName)}</p>
      <p style="margin:0 0 14px;">
        Merci de votre inscription. Votre espace client est prêt pour découvrir nos univers alimentaires et d’hygiène, passer commande et suivre vos livraisons.
      </p>
      <p style="margin:0;">
        Besoin d’un devis pro ? Notre équipe est disponible pour vous accompagner.
      </p>
    `,
    ctaLabel: 'Accéder à mon compte',
    ctaUrl: `${vars.siteUrl}/compte`,
  });

  return {
    subject: `Bienvenue chez ${vars.brandName}`,
    html,
    text: `Bonjour ${vars.customerName},\n\nMerci de votre inscription sur ${vars.brandName}. Votre compte est prêt.\n\nAccéder à mon compte : ${vars.siteUrl}/compte\n\nL’équipe ${vars.brandName}`,
  };
}

export function orderConfirmedEmail(vars: OrderEmailVars) {
  const title = 'Commande confirmée';
  const html = layout({
    brand: vars,
    preheader: `Votre commande ${vars.orderNumber} est confirmée.`,
    title,
    bodyHtml: `
      <p style="margin:0 0 14px;">${greeting(vars.customerName)}</p>
      <p style="margin:0 0 14px;">
        Nous avons bien confirmé votre commande <strong>${escapeHtml(vars.orderNumber)}</strong>.
        Notre équipe prépare la suite de son traitement.
      </p>
      <p style="margin:0;">Vous recevrez un nouvel email dès qu’elle passera en préparation.</p>
    `,
    ctaLabel: 'Voir ma commande',
    ctaUrl: vars.orderUrl,
  });

  return {
    subject: `Commande confirmée · ${vars.orderNumber}`,
    html,
    text: `Bonjour ${vars.customerName},\n\nVotre commande ${vars.orderNumber} est confirmée.\n\nVoir ma commande : ${vars.orderUrl}\n\nL’équipe ${vars.brandName}`,
  };
}

export function orderPreparingEmail(vars: OrderEmailVars) {
  const title = 'Commande en préparation';
  const html = layout({
    brand: vars,
    preheader: `Votre commande ${vars.orderNumber} est en préparation.`,
    title,
    bodyHtml: `
      <p style="margin:0 0 14px;">${greeting(vars.customerName)}</p>
      <p style="margin:0 0 14px;">
        Bonne nouvelle : votre commande <strong>${escapeHtml(vars.orderNumber)}</strong> est maintenant en préparation dans nos entrepôts.
      </p>
      <p style="margin:0;">Nous vous préviendrons dès qu’elle sera en livraison.</p>
    `,
    ctaLabel: 'Suivre ma commande',
    ctaUrl: vars.orderUrl,
  });

  return {
    subject: `En préparation · ${vars.orderNumber}`,
    html,
    text: `Bonjour ${vars.customerName},\n\nVotre commande ${vars.orderNumber} est en préparation.\n\nSuivre ma commande : ${vars.orderUrl}\n\nL’équipe ${vars.brandName}`,
  };
}

export function orderShippingEmail(vars: OrderEmailVars) {
  const title = 'Commande en livraison';
  const tracking =
    vars.trackingNumber?.trim()
      ? `<p style="margin:16px 0 0;padding:14px 16px;background:#f3f6f9;border-radius:12px;">
           <strong>Suivi</strong><br />
           ${vars.carrierName ? `${escapeHtml(vars.carrierName)} · ` : ''}
           <span style="font-family:Consolas,monospace;">${escapeHtml(vars.trackingNumber.trim())}</span>
         </p>`
      : '';

  const html = layout({
    brand: vars,
    preheader: `Votre commande ${vars.orderNumber} est en livraison.`,
    title,
    bodyHtml: `
      <p style="margin:0 0 14px;">${greeting(vars.customerName)}</p>
      <p style="margin:0 0 14px;">
        Votre commande <strong>${escapeHtml(vars.orderNumber)}</strong> est en cours de livraison.
      </p>
      <p style="margin:0;">Préparez-vous à la réception — nous restons disponibles en cas de besoin.</p>
      ${tracking}
    `,
    ctaLabel: 'Voir le suivi',
    ctaUrl: vars.orderUrl,
  });

  return {
    subject: `En livraison · ${vars.orderNumber}`,
    html,
    text: `Bonjour ${vars.customerName},\n\nVotre commande ${vars.orderNumber} est en livraison.${
      vars.trackingNumber
        ? `\nSuivi : ${vars.carrierName ? `${vars.carrierName} / ` : ''}${vars.trackingNumber}`
        : ''
    }\n\nVoir le suivi : ${vars.orderUrl}\n\nL’équipe ${vars.brandName}`,
  };
}

export function orderDeliveredEmail(vars: OrderEmailVars) {
  const title = 'Commande livrée';
  const html = layout({
    brand: vars,
    preheader: `Votre commande ${vars.orderNumber} a été livrée.`,
    title,
    bodyHtml: `
      <p style="margin:0 0 14px;">${greeting(vars.customerName)}</p>
      <p style="margin:0 0 14px;">
        Votre commande <strong>${escapeHtml(vars.orderNumber)}</strong> a bien été livrée.
      </p>
      <p style="margin:0;">
        Merci pour votre confiance. N’hésitez pas à revenir vers nous pour vos prochains besoins d’approvisionnement.
      </p>
    `,
    ctaLabel: 'Retourner à la boutique',
    ctaUrl: `${vars.siteUrl}/catalogue`,
  });

  return {
    subject: `Livrée · ${vars.orderNumber}`,
    html,
    text: `Bonjour ${vars.customerName},\n\nVotre commande ${vars.orderNumber} a été livrée.\n\nCatalogue : ${vars.siteUrl}/catalogue\n\nL’équipe ${vars.brandName}`,
  };
}

export type AdminAlertVars = BrandVars & {
  title: string;
  preheader: string;
  rows: Array<{ label: string; value: string }>;
  message?: string | null;
  ctaLabel: string;
  ctaUrl: string;
  subject: string;
};

export function adminAlertEmail(vars: AdminAlertVars) {
  const rowsHtml = vars.rows
    .map(
      (row) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(14,42,71,0.08);width:34%;font-size:13px;color:#64748b;vertical-align:top;">
          ${escapeHtml(row.label)}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid rgba(14,42,71,0.08);font-size:14px;color:#0e2a47;font-weight:600;vertical-align:top;">
          ${escapeHtml(row.value)}
        </td>
      </tr>`,
    )
    .join('');

  const messageHtml = vars.message?.trim()
    ? `<p style="margin:18px 0 0;padding:14px 16px;background:#f3f6f9;border-radius:12px;white-space:pre-wrap;">${escapeHtml(vars.message.trim())}</p>`
    : '';

  const html = layout({
    brand: vars,
    preheader: vars.preheader,
    title: vars.title,
    bodyHtml: `
      <p style="margin:0 0 14px;">Nouvelle alerte sur ${escapeHtml(vars.brandName)}.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ${rowsHtml}
      </table>
      ${messageHtml}
    `,
    ctaLabel: vars.ctaLabel,
    ctaUrl: vars.ctaUrl,
  });

  const textRows = vars.rows
    .map((r) => `${r.label}: ${r.value}`)
    .join('\n');

  return {
    subject: vars.subject,
    html,
    text: `${vars.title}\n\n${textRows}${
      vars.message?.trim() ? `\n\nMessage:\n${vars.message.trim()}` : ''
    }\n\n${vars.ctaLabel}: ${vars.ctaUrl}`,
  };
}

