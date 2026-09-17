import { PublicToolPage, publicToolHead } from "@/components/PublicToolPage";
import { publicTools, type PublicToolSlug } from "@/lib/public-tools";
import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/ferramentas/$slug")({
  loader: ({ params }) => {
    if (!(params.slug in publicTools)) throw notFound();
    return { slug: params.slug as PublicToolSlug };
  },
  head: ({ loaderData }) => loaderData ? publicToolHead(loaderData.slug) : ({
    meta: [{ title: "Ferramenta não encontrada | IDOC BUSINESS" }, { name: "robots", content: "noindex" }],
  }),
  component: ToolLandingRoute,
});

function ToolLandingRoute() {
  const { slug } = Route.useLoaderData();
  return <PublicToolPage slug={slug} />;
}