// Message builder: the Discord text posted alongside the Card.

/** Bold headline, a "-#" line with Outlet and date, then the link (wrapped in <> to suppress the Embed). */
export function buildMessage({ headline, outlet, date, link }, suppressEmbed = true) {
  const meta = [outlet, date].filter(Boolean).join(" · ");
  return `**${headline}**\n-# ${meta}\n${suppressEmbed ? `<${link}>` : link}`;
}
