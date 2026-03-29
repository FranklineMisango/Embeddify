"""LinkedIn job scraper using Playwright (no login required for public listings)."""
import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

async def scrape_linkedin(query: str, location: str = "", limit: int = 25) -> list[dict]:
    url = (
        f"https://www.linkedin.com/jobs/search/?keywords={query.replace(' ', '%20')}"
        f"&location={location.replace(' ', '%20')}&f_TPR=r86400"  # last 24h
    )
    jobs = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, wait_until="networkidle", timeout=30000)
        await page.wait_for_selector(".jobs-search__results-list", timeout=10000)

        # Scroll to load more
        for _ in range(3):
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(1.5)

        soup = BeautifulSoup(await page.content(), "html.parser")
        cards = soup.select(".jobs-search__results-list li")[:limit]

        for card in cards:
            title_el = card.select_one(".base-search-card__title")
            company_el = card.select_one(".base-search-card__subtitle")
            location_el = card.select_one(".job-search-card__location")
            link_el = card.select_one("a.base-card__full-link")
            if not title_el:
                continue
            jobs.append({
                "title": title_el.get_text(strip=True),
                "company": company_el.get_text(strip=True) if company_el else "",
                "location": location_el.get_text(strip=True) if location_el else "",
                "url": link_el["href"].split("?")[0] if link_el else "",
                "source": "linkedin",
                "description": "",  # fetched separately
            })

        # Fetch descriptions for first 10
        for job in jobs[:10]:
            if job["url"]:
                try:
                    await page.goto(job["url"], wait_until="networkidle", timeout=20000)
                    desc_el = await page.query_selector(".description__text")
                    if desc_el:
                        job["description"] = await desc_el.inner_text()
                except Exception:
                    pass

        await browser.close()
    return jobs
