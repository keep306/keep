import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { handleApi, type Catalog } from '@/lib/backend/api';
import products from '@/content/products.json';
import swatches from '@/content/swatches.json';
import settings from '@/content/settings.json';

const defaults = { products, swatches, settings } as Catalog;
async function route(request: Request) {
  return handleApi(request, {
    db: env.DB,
    adminEmails: env.ADMIN_EMAILS,
    user: await getChatGPTUser(),
    defaults,
  });
}
export { route as GET, route as POST, route as PUT, route as PATCH };
