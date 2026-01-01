
from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 412, 'height': 915})
        page = context.new_page()

        try:
            print("Navigating to game...")
            page.goto("http://localhost:5173")
            time.sleep(2)

            print("Taking New Lobby Screenshot...")
            page.screenshot(path="/home/jules/verification/lobby_new.png")

            print("Starting Game...")
            # Click center to start (Start Button)
            page.locator("canvas").click(position={"x": 206, "y": 549})
            time.sleep(2)

            print("Taking Game Controls Screenshot...")
            page.screenshot(path="/home/jules/verification/game_controls.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
