import { HiAnime } from "aniwatch";

async function test() {
    const hianime = new HiAnime.Scraper();
    try {
        const sources = await hianime.getEpisodeSources("naruto-shippuden-355?ep=7822");
        console.log(JSON.stringify(sources, null, 2));
    } catch (e) {
        console.error("Scraping error:", e.message);
    }
}
test();
