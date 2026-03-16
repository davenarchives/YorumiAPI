import { ANIME } from "@consumet/extensions";

async function test() {
    const go = new ANIME.Gogoanime();
    
    console.log("Searching for naruto...");
    const search = await go.search("naruto shippuden");
    console.log("First result:", JSON.stringify(search.results[0], null, 2));
    
    const id = search.results[0].id;
    console.log("\nFetching episodes for:", id);
    const info = await go.fetchAnimeInfo(id);
    const ep = (info.episodes as any[])[0];
    console.log("First episode:", JSON.stringify(ep, null, 2));
    
    console.log("\nFetching sources for:", ep.id);
    const sources = await go.fetchEpisodeSources(ep.id);
    console.log("Sources:", JSON.stringify(sources.sources?.slice(0, 2), null, 2));
}

test().catch(console.error);
