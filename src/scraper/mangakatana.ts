import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://mangakatana.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': BASE_URL,
    },
    timeout: 15000,
});

export interface HotUpdate {
    id: string;
    title: string;
    chapter: string;
    url: string;
    thumbnail: string;
    source: 'mangakatana';
}

export interface MangaSearchResult {
    id: string;
    title: string;
    url: string;
    thumbnail: string;
    latestChapter?: string;
    author?: string; // New field for matching
    altNames?: string[]; // New field for matching
    source: 'mangakatana';
}

export interface MangaDetails {
    id: string;
    title: string;
    altNames: string[];
    author: string;
    status: string;
    genres: string[];
    synopsis: string;
    coverImage: string;
    url: string;
    source: 'mangakatana';
}

export interface Chapter {
    id: string;
    title: string;
    url: string;
    uploadDate: string;
}

export interface ChapterPage {
    pageNumber: number;
    imageUrl: string;
}

/**
 * Search for manga on MangaKatana
 */
export async function searchManga(query: string): Promise<MangaSearchResult[]> {
    try {
        console.log(`[searchManga] Searching for: "${query}"`);
        const searchUrl = `${BASE_URL}/?search=${encodeURIComponent(query)}&search_by=book_name`;

        const response = await axiosInstance.get(searchUrl);
        const $ = cheerio.load(response.data);
        const results: MangaSearchResult[] = [];

        $('#book_list > div.item').each((_, element) => {
            const $el = $(element);
            const linkEl = $el.find('div.text > h3 > a');
            const title = linkEl.text().trim();
            const url = linkEl.attr('href') || '';
            const thumbnail = $el.find('div.cover img').attr('src') || '';

            const genres: string[] = [];
            $el.find('.genres a').each((_, g) => {
                genres.push($(g).text().toLowerCase());
            });

            const isNsfw = ['hentai', 'adult', 'smut'].some(term =>
                title.toLowerCase().includes(term) ||
                genres.some(g => g.includes(term))
            );
            if (isNsfw) return;

            const chapters = $el.find('div.text .chapter a');
            let latestChapter = '';
            if (chapters.length > 0) {
                latestChapter = chapters.first().text().trim();
            }

            const id = url.replace(`${BASE_URL}/manga/`, '').replace(/\/$/, '');

            if (title && url) {
                results.push({ id, title, url, thumbnail, latestChapter, author: '', altNames: [], source: 'mangakatana' });
            }
        });

        // Check for direct redirect to a detail page
        if (results.length === 0) {
            const detailTitle = $('.info .heading').text().trim();
            if (detailTitle) {
                const genres: string[] = [];
                $('.genres a').each((_, g) => { genres.push($(g).text().toLowerCase()); });
                const isNsfw = ['hentai', 'adult', 'smut'].some(t =>
                    detailTitle.toLowerCase().includes(t) || genres.some(g => g.includes(t))
                );
                if (!isNsfw) {
                    const detailUrl = $('link[rel=canonical]').attr('href') || searchUrl;
                    if (detailUrl.includes('/manga/')) {
                        const id = detailUrl.split('/manga/')[1].replace(/\/$/, '');
                        const thumbnail = $('div.media div.cover img').attr('src') || '';
                        results.push({ id, title: detailTitle, url: detailUrl, thumbnail, source: 'mangakatana' });
                    }
                }
            }
        }

        console.log(`[searchManga] Found ${results.length} results for "${query}"`);
        return results;
    } catch (error) {
        console.error('[searchManga] Error searching manga:', error);
        throw error;
    }
}

/**
 * Get manga details from MangaKatana
 */
export async function getMangaDetails(mangaId: string): Promise<MangaDetails> {
    try {
        const url = `${BASE_URL}/manga/${mangaId}`;
        const response = await axiosInstance.get(url);
        const $ = cheerio.load(response.data);

        const title = $('h1.heading').text().trim();
        const altNames = $('.alt_name').text().split(';').map(s => s.trim()).filter(Boolean);
        const author = $('.author').text().trim();
        const status = $('.value.status').text().trim();
        const genres = $('.genres > a').map((_, el) => $(el).text().trim()).get();
        const synopsis = $('.summary > p').text().trim();
        const coverImage = $('div.media div.cover img').attr('src') || '';

        return {
            id: mangaId,
            title,
            altNames,
            author,
            status,
            genres,
            synopsis,
            coverImage,
            url,
            source: 'mangakatana',
        };
    } catch (error) {
        console.error('Error fetching manga details:', error);
        throw error;
    }
}

/**
 * Get chapter list for a manga
 */
export async function getChapterList(mangaId: string): Promise<Chapter[]> {
    try {
        const url = `${BASE_URL}/manga/${mangaId}`;
        console.log(`[getChapterList] Fetching chapters from: ${url}`);

        const response = await axiosInstance.get(url);
        const $ = cheerio.load(response.data);
        const chapters: Chapter[] = [];

        $('tr:has(.chapter)').each((_, element) => {
            const $el = $(element);
            const linkEl = $el.find('.chapter a');
            const chapterTitle = linkEl.text().trim();
            const rawChapterUrl = linkEl.attr('href') || '';
            const chapterUrl = rawChapterUrl.startsWith('http')
                ? rawChapterUrl
                : `${BASE_URL}${rawChapterUrl.startsWith('/') ? '' : '/'}${rawChapterUrl}`;
            const uploadDate = $el.find('.update_time').text().trim();
            const chapterId = chapterUrl.replace(/\/$/, '').split('/').pop() || '';

            if (chapterTitle && chapterUrl) {
                chapters.push({ id: chapterId, title: chapterTitle, url: chapterUrl, uploadDate });
            }
        });

        console.log(`[getChapterList] Found ${chapters.length} chapters`);
        return chapters;
    } catch (error) {
        console.error('[getChapterList] Error fetching chapter list:', error);
        throw error;
    }
}

/**
 * Get page images for a chapter
 * First tries fast regex extraction, falls back to Puppeteer if needed
 */
export async function getChapterPages(chapterUrl: string): Promise<ChapterPage[]> {
    const normalizedChapterUrl = chapterUrl.startsWith('http')
        ? chapterUrl
        : `${BASE_URL}${chapterUrl.startsWith('/') ? '' : '/'}${chapterUrl}`;

    // First try fast regex extraction (no browser needed)
    try {
        console.log(`[Fast] Fetching ${normalizedChapterUrl}...`);
        // Use direct axios call like the working test script to avoid instance issues
        const response = await axios.get(normalizedChapterUrl, {
            headers: {
                'User-Agent': USER_AGENT
            },
            timeout: 15000
        });
        const html = response.data;

        // Look for JavaScript array containing image URLs
        // MangaKatana stores images in variables like: var thzq = ['url1', 'url2', ...]
        // The array can span multiple lines and contain many URLs

        // First, try to find common variable names with their full array content
        const varNames = ['thzq', 'ytaw', 'htnc'];
        for (const varName of varNames) {
            const pattern = new RegExp(`var\\s+${varName}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'm');
            const match = html.match(pattern);
            if (match && match[1]) {
                // Extract all URLs from the array content
                const arrayContent = match[1];
                const urlPattern = /['"]([^'"]+)['"]/g;
                const urls: string[] = [];
                let urlMatch;
                while ((urlMatch = urlPattern.exec(arrayContent)) !== null) {
                    const url = urlMatch[1];
                    if (url.includes('http') || url.startsWith('//')) {
                        urls.push(url.startsWith('//') ? `https:${url}` : url);
                    }
                }
                if (urls.length > 0) {
                    console.log(`[Fast] Found ${urls.length} pages via regex (${varName})`);
                    return urls.map((url, index) => ({
                        pageNumber: index + 1,
                        imageUrl: url
                    }));
                }
            }
        }

        // Try finding data-src in img tags
        const $ = cheerio.load(html);
        const imgs: string[] = [];
        $('#imgs img').each((_, el) => {
            const src = $(el).attr('data-src') || $(el).attr('src');
            if (src && (src.includes('http') || src.startsWith('//'))) {
                imgs.push(src.startsWith('//') ? `https:${src}` : src);
            }
        });

        if (imgs.length > 0) {
            console.log(`[Fast] Found ${imgs.length} pages via cheerio`);
            return imgs.map((url, index) => ({
                pageNumber: index + 1,
                imageUrl: url
            }));
        }

        console.log('[Fast] No images found, falling back to Puppeteer...');
    } catch (fastError) {
        console.log('[Fast] Failed, falling back to Puppeteer...', fastError);
    }

    // If no pages found via fast regex/cheerio, return empty
    console.log('[getChapterPages] No images found via regex or cheerio.');
    return [];
}

/**
 * Get hot updates from MangaKatana homepage
 */
export async function getHotUpdates(): Promise<HotUpdate[]> {
    try {
        console.log('Fetching hot updates from MangaKatana...');
        const response = await axiosInstance.get(BASE_URL);
        const $ = cheerio.load(response.data);
        const updates: HotUpdate[] = [];

        let container = $('#hot_update');
        if (container.length === 0) container = $('.widget-hot-update');

        container.find('.item').each((_, element) => {
            const $el = $(element);
            const imgEl = $el.find('.wrap_img img');
            const thumbnail = imgEl.attr('data-src') || imgEl.attr('src') || '';
            const titleEl = $el.find('.title a');
            const title = titleEl.text().trim();
            const url = titleEl.attr('href') || '';

            if (['hentai', 'adult', 'smut'].some(term => title.toLowerCase().includes(term))) return;

            const chapter = $el.find('.chapter a').first().text().trim();

            if (title && url) {
                const id = url.split('/manga/')[1]?.replace(/\/$/, '') || '';
                updates.push({ id, title, chapter, url, thumbnail, source: 'mangakatana' });
            }
        });

        console.log(`Found ${updates.length} hot updates.`);
        return updates.slice(0, 15);
    } catch (error) {
        console.error('Error fetching hot updates:', error);
        return [];
    }
}
