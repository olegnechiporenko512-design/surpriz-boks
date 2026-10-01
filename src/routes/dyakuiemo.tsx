import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const FB_PIXEL_ID = "1749190629525376";

const THANKS_PIXEL = `(function(){try{var raw=sessionStorage.getItem('lead_order');if(!raw)return;var order=JSON.parse(raw);if(!order||!order.order_id)return;var key='sent_'+order.order_id;try{if(localStorage.getItem(key))return;localStorage.setItem(key,'1');}catch(e){}if(typeof fbq!=='function')return;var fn=String(order.name||'').trim().toLowerCase();var ph=String(order.phone||'');fbq('set','autoConfig',false,'${FB_PIXEL_ID}');fbq('init','${FB_PIXEL_ID}',{ph:ph,fn:fn});fbq('track','PageView');var payload={value:Number(order.total)||0,currency:'UAH',content_name:String(order.variant||'')};var ids={eventID:String(order.order_id)};fbq('track','Lead',payload,ids);fbq('track','Purchase',payload,ids);}catch(e){}})();`;

type StoredOrder = {
  order_id: string;
  name: string;
  phone: string;
  variant: string;
  quantity: number;
  total: number;
  product: string;
};

export const Route = createFileRoute("/dyakuiemo")({
  head: () => ({
    meta: [
      { title: "Дякуємо за замовлення" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ThanksPage,
});

function readOrder(): StoredOrder | null {
  try {
    const raw = sessionStorage.getItem("lead_order");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredOrder>;
    if (!parsed || typeof parsed.order_id !== "string" || typeof parsed.name !== "string") return null;
    return {
      order_id: parsed.order_id,
      name: parsed.name,
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      variant: typeof parsed.variant === "string" ? parsed.variant : "",
      quantity: typeof parsed.quantity === "number" ? parsed.quantity : 1,
      total: typeof parsed.total === "number" ? parsed.total : 0,
      product: typeof parsed.product === "string" ? parsed.product : "Сюрприз бокс",
    };
  } catch {
    return null;
  }
}

function ThanksPage() {
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOrder(readOrder());
    setReady(true);
  }, []);

  return (
    <main className="page">
      <div className="sheet thanks-page">
        {!ready || !order ? (
          <div className="thanks" role="status">
            <h1>Дякуємо!</h1>
            {ready ? (
              <p>
                <Link to="/">На сторінку замовлення</Link>
              </p>
            ) : (
              <p>Замовлення перевіряємо…</p>
            )}
          </div>
        ) : (
          <div className="thanks" role="status">
            <p className="thanks-kicker">Замовлення прийнято</p>
            <h1>Дякуємо, {order.name}!</h1>
            <p>Замовлення №{order.order_id} прийнято</p>
            <p>
              {order.product}
              <br />
              {order.variant}
              <br />
              {order.quantity} шт · {order.total} грн
            </p>
            <p>Менеджер зателефонує найближчим часом для підтвердження. Оплата при отриманні на Новій Пошті.</p>
            <p>
              <Link to="/">На сторінку замовлення</Link>
            </p>
          </div>
        )}
        <div id="upsell" />
      </div>
      <script dangerouslySetInnerHTML={{ __html: THANKS_PIXEL }} />
    </main>
  );
}
