/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import homeHtml from '../public/index.html'

export default {
  async fetch(request, env, ctx): Promise<Response> {
    // will only run as a middleware for the home page and other non-asset paths
    const url = new URL(request.url);

    const coordsPath = url.pathname.split("/").pop() || "";
    let coords = [];

    if (coordsPath.startsWith('@') && coordsPath.split(',').length === 2) {
      coords = coordsPath.substring(1).split(',');
    } else {
      coords = [request.cf?.latitude, request.cf?.longitude];
    }
    const modHomeHtml = homeHtml.replace("let COORDS = [];", `const COORDS = ["${coords[0]}", "${coords[1]}"];`);

    return new Response(modHomeHtml, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    });
  },
} satisfies ExportedHandler<Env>;
