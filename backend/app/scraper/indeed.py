"""Indeed scraper via httpx + BeautifulSoup."""
import httpx
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
}

async def scrape_indeed(query: str, location: str = "", limit: int = 25) -> list[dict]:
    url = f"https://www.indeed.com/jobs?q={query.replace(' ', '+')}&l={location.replace(' ', '+')}&fromage=1"
    jobs = []
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=20) as client:
        resp = await client.get(url)
        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.select("div.job_seen_beacon")[:limit]
        for card in cards:
            title_el = card.select_one("h2.jobTitle span")
            company_el = card.select_one("[data-testid='company-name']")
            location_el = card.select_one("[data-testid='text-location']")
            link_el = card.select_one("h2.jobTitle a")
            snippet_el = card.select_one(".job-snippet")
            if not title_el:
                continue
            jobs.append({
                "title": title_el.get_text(strip=True),
                "company": company_el.get_text(strip=True) if company_el else "",
                "location": location_el.get_text(strip=True) if location_el else "",
                "url": "https://www.indeed.com" + link_el["href"] if link_el else "",
                "source": "indeed",
                "description": snippet_el.get_text(strip=True) if snippet_el else "",
            })
    return jobs
